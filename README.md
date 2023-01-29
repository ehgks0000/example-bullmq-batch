# 메시지 큐를 이용한 이미지 파일 확장자 변환을 batch.

## 실행방법

1. 레디스 실행

root 디렉토리에서
`docker-compose up --build`

2. express 실행
   `ts-node ./src/index.ts`

3. bullmq Worker 실행
   `ts-node ./src/image_process/worker.ts`

## 레디스 접속 방법

`docker exec -it test-bull redis-cli`

> 컨테이너 이름이 'test-bull'이 아닌 경우, `docker container ls`에서 이름 확인.

## 테스트 방법

아래 요청을 보내 이미지 변환 도중 에러가 발생한 경우  
레디스 큐에 다시 push된 것을 확인.

1. POST localhost:3000/bulk

- Req Body

```json
{
  "name": "11.png" // 이미지 파일명.
}
```
