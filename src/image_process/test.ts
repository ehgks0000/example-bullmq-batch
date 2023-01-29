import { NotFoundFile, processUploadedImages } from "./util";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const BULK_EVENT_NAME = "bulk";

type Job = { name: string };
// type Job = Record<string, any>;

const connection = new IORedis({
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null,
});

const bulkJobQueue = new Queue<Job, any, string>(BULK_EVENT_NAME, {
  connection,
});

// addBulk test
const test = async () => {
  const list = [Promise.resolve(1), Promise.reject("err")];
  const rv = await Promise.allSettled(list);
};

if (require.main === module) {
  test();
}
