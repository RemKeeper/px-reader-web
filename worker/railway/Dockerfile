FROM denoland/deno:2.1.4

WORKDIR /app

# 复制代理相关文件
COPY main.ts .
COPY deno.json .

# 预缓存代码
RUN deno cache main.ts

# Railway 容器监听由内部端口决定，CMD 启动服务
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]
