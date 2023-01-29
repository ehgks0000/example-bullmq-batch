import { Job, Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { ProcessImageError, processUploadedImages } from "./util";

interface PromiseFulfilledResult<T> {
  status: "fulfilled";
  value: T;
}

interface PromiseRejectedResult {
  status: "rejected";
  reason: Error;
}

type PromiseSettledResult<T> =
  | PromiseFulfilledResult<T>
  | PromiseRejectedResult;

const isProcessImageError = (
  result: PromiseRejectedResult
): result is PromiseRejectedResult & { reason: ProcessImageError } => {
  return result.reason instanceof ProcessImageError;
};

type BulkJob = {
  name: string;
};

const BULK_EVENT_NAME = "bulk";
const DAY = 1000 * 60 * 60 * 24;

const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

// 이미지 변환할 파일명을 큐에 삽입.
const workerBulkHandler = async (job: Job<BulkJob, any, any>) => {
  console.log("Starting job:", job.name);
  console.log("Finished job:", job.name);
  return job.data.name;
};

const bulkJobQueue = new Queue<BulkJob>(BULK_EVENT_NAME, {
  connection,
});

// 이미지 변환 중 에러발생 한 것들만 필터링.
const filterBulkList = (results: PromiseSettledResult<string>[]) => {
  return results
    .filter(
      (index): index is PromiseRejectedResult =>
        index.status === "rejected" && index.reason !== undefined
    )
    .filter(isProcessImageError);
};

const generateBulkList = (
  results: PromiseRejectedResult[],
  queueName: string = BULK_EVENT_NAME
) => {
  return results.map((index) => ({
    name: queueName,
    data: { name: index.reason.message },
  }));
};

const popAndReinsertQueue = async () => {
  // 큐 불러오기
  const queue = await bulkJobQueue.getCompleted();

  // 큐에서 이름만 추출
  const names = queue.map(({ data }) => data.name);
  if (names.length < 1) {
    console.log("없음 names");
    return;
  }

  // 이미지 파일 변환 -> webp
  // const jobs = names.map((name) => processUploadedImages({ name }));
  const results = await Promise.allSettled(
    names.map((name) => processUploadedImages({ name }))
  );

  console.log("results :", results);

  // 큐 삭제
  await bulkJobQueue.obliterate();

  // reject된 프로미스 중 image process 중 에러난 것들을 다시 큐에 삽입.
  // reinsert
  await bulkJobQueue.addBulk(
    generateBulkList(filterBulkList(results), BULK_EVENT_NAME)
  );
};

// 하루마다 실행.
// @TODO 나중에 크론잡으로 변경?
// 워커 노드가 재실행 ->
const cronJob = () => {
  return new Promise((res) => {
    setInterval(() => {
      popAndReinsertQueue();
      res(null);
    }, DAY);
  });
};

const main = () => {
  const workerBulk = new Worker(BULK_EVENT_NAME, workerBulkHandler, {
    connection,
  });
  console.log("Worker started!");

  cronJob();
};

main();
