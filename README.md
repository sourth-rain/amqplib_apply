此为node.js利用rabbitMq来实现负载均衡，基于amqplib。
客户端向A系统发起请求，A系统再向B系统进行任务分发。
B系统将结果返回给A系统，A系统再将结果返回给浏览器。

B系统github地址：https://github.com/sourth-rain/amqplib_apply_server

运行步骤：localhost:31100运行A系统，同时运行B系统，无须开启express服务器，在终端进入项目根目录执行node scriptTools/actMqTask.js即可
不断刷新A系统地址，B系统即可通过A系统不断返回数据给浏览器端。


