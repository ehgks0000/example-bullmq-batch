import express from "express";
import { JobsOptions, Queue, QueueEvents } from "bullmq";
import fileUpload from "express-fileupload";
import path from "path";
import IORedis from "ioredis";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const UPLOAD_IMAGE = "imageJobQueue";
const BULK_EVENT_NAME = "bulk";
const MAX_QUEUE = 5;

const EVENTS = [BULK_EVENT_NAME] as const;
// const EVENTS = [UPLOAD_IMAGE, BULK_EVENT_NAME] as const;
const DAY = 1000 * 60 * 60 * 24;
const HALF_M = 1000 * 30;

type BulkJob = {
  name: string;
};

type Job = BulkJob;

const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

const queueEvents = new QueueEvents(UPLOAD_IMAGE, { connection });

queueEvents.on("added", ({ jobId }) => {
  console.log("added :", jobId);
});
queueEvents.on("completed", ({ jobId }) => {
  console.log("done :", jobId);
});
queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log("failedReason :", jobId, failedReason);
});

const q2 = new QueueEvents(BULK_EVENT_NAME, { connection });
q2.on("added", ({ jobId }) => {
  console.log("bulk added :", jobId);
});

q2.on("delayed", ({ jobId }) => {
  console.log("bulk delayed :", jobId);
});

const main = async () => {
  // const imageJobQueue = new Queue(UPLOAD_IMAGE, {
  //   connection,
  // });

  const bulkJobQueue = new Queue<BulkJob, any, any>(BULK_EVENT_NAME, {
    connection,
  });

  const EVENT_LIST = {
    // [UPLOAD_IMAGE]: imageJobQueue,
    [BULK_EVENT_NAME]: bulkJobQueue,
  };
  // const E = Object.keys(EVENT_LIST);

  const addJob = async (
    e: typeof EVENTS[number],
    data: Job,
    option?: JobsOptions
  ) => {
    console.log(e);
    await EVENT_LIST[e].add(e, data, option);
  };

  const serverAdapter = new ExpressAdapter();
  const bullBoard = createBullBoard({
    queues: [new BullMQAdapter(bulkJobQueue)],
    serverAdapter: serverAdapter,
  });
  serverAdapter.setBasePath("/admin");

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(fileUpload());
  app.use(express.static(path.join(__dirname, "image_process/public/images")));

  // bullMQ 어드민 페이지
  app.use("/admin", serverAdapter.getRouter());

  // 1. 저장된 모든 이미지 파일 불러오기
  // 2. 큐 삭제
  // 3. 불러온 이미지 배열로 이미지 변환.
  // app.get("/test", async (req, res) => {
  //   const rv = await bulkJobQueue.getCompleted();

  //   await bulkJobQueue.obliterate();

  //   const name = rv.map((data) => {
  //     return data.data.data.name;
  //   });

  //   res.json({ msg: "test", name });
  // });

  app.post("/bulk", async (req, res) => {
    const name = req.body.name;

    // 파일 이름을 저장.
    await addJob(BULK_EVENT_NAME, {
      name,
    });

    res.json({ msg: "bulk done" });
  });

  // app.post("/upload", async (req, res) => {
  //   const { image } = (req as any).files;

  //   if (!image) {
  //     res.json({ msg: "err" });
  //     return;
  //   }

  //   await addJob(UPLOAD_IMAGE, {
  //     // type: "processUploadedImages",
  //     data: Buffer.from(image.data).toString("base64"),
  //     name: image.name,
  //   });

  //   res.json({ msg: "done" });
  // });

  app.listen(3000, () => {
    console.log("app open 3000");
  });
};

main();
