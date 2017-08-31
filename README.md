基于amqplib 来实现负载均衡。
客户端向A系统发起请求，A系统再向B系统进行任务分发。
B系统将结果返回给A系统，A系统再将结果返回给浏览器。


B系统github地址：https://github.com/sourth-rain/amqplib_apply_server
