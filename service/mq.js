'use strict';

const amqp = require('amqplib');
const util = require('util');
const env = process.env.NODE_ENV || 'development';
const path = require('path');
const config = require(path.join(__dirname, '../config/config.json'))[env]['mq'];

let Mq = function (options) {
  this.options = options || {};
  this.channel = null;
  this.host = config.host;
  this.password = config.password;
  this.user = config.user;
  this.isConnected = false;
};

Mq.prototype.createChannel = function () {
  let that = this;
  let vhost = that.options.vhost || '';
  //vHost需要被转码以应对'/a'的情况
  vhost = vhost ? '/' + encodeURIComponent(vhost) : vhost;
  return amqp.connect('amqp://' + that.user + ':' + that.password + '@' + that.host + vhost, {
    heartbeat: 1
  })
    .then(function (conn) {
      if (!conn) {
        throw ('获取链接失败!');
      }
      conn.on('error', function (error) {
        console.log(error);
      });
      conn.on('close', function (error) {
        console.log(error);
      });
      return conn.createChannel();
    })
    .then(function (channel) {
      if (!channel) {
        throw ('建立通道失败！');
      }
      that.isConnected = true;
      that.channel = channel;
      return Promise.resolve(that.channel);
    })
};

Mq.prototype.ack = function (msg) {
  if (!this.isConnected) {
    return Promise.reject('尚未开启链接！');
  }
  return this.channel.ack(msg);
}

let Queue = function (queueName, options) {
  //获取Mq配置
  Mq.call(this, options);
  this.queue = queueName;
  this.messageCount = 0;
  this.consumerCount = 0;
  this.isAlive = false;
  this.options = options || {};
}

//使Queue继承Mq
util.inherits(Queue, Mq);

Queue.prototype.createQueue = function () {
  let queue = this;
  if (queue.isAlive) {
    return Promise.resolve();
  }
  return Promise.resolve()
    .then(function () {
      if (!queue.isConnected) {
        return queue.createChannel();
      }
      return Promise.resolve();
    })
    .then(function () {
      return queue.channel.assertQueue(queue.queue, queue.options);
    })
    .then(function (data) {
      queue.isAlive = true;
      queue.consumerCount = data.consumerCount;
      queue.messageCount = data.messageCount;
      queue.channel.on('error', function (error) {
        console.log(error);
      });
      //一般error事件之后会捕捉到close事件
      queue.channel.on('close', function (error) {
        queue.isAlive = false;
        queue.isConnected = false;
        console.log(error);
      });
      return Promise.resolve();
    })
}

/**
 * 检查队列状态
 * @returns {Promise|*}
 */
Queue.prototype.check = function () {
  let queue = this;
  return queue.channel.checkQueue(queue.queue)
    .then(function (data) {
      if (!data) {
        queue.isAlive = false;
        throw ('队列已经关闭');
      }
      queue.consumerCount = data.consumerCount;
      queue.messageCount = data.messageCount;
      return Promise.resolve(queue);
    });
};

/**
 * 发送消息
 * @param message
 * @returns {Promise|*}
 */
Queue.prototype.sendToQueue = function (message) {
  let queue = this;
  if (typeof message == 'object') {
    message = JSON.stringify(message);
  }
  message = new Buffer(message + '', 'utf8');
  return queue.createQueue()
    .then(function () {
      return queue.channel.sendToQueue(queue.queue, message);
    });
};

/**
 * 获取消息
 * @returns {Promise|*}
 */
Queue.prototype.get = function () {
  let queue = this;
  return queue.createQueue()
    .then(function () {
      return queue.channel.get(queue.queue, {
        noAck: true
      });
    })
    .then(function (data) {
      data.value = data.content.toString();
      return Promise.resolve(data);
    });
};

/**
 * 作为一个消费者绑定队列
 */
Queue.prototype.consume = function (callback) {
  let queue = this;
  return queue.createQueue()
    .then(function () {
      return queue.channel.consume(queue.queue, function (msg) {
        let data = msg && msg.content.toString() || '{}';
        try {
          data = JSON.parse(data);
        } catch (error) {
          console.log(error);
        }
        callback(data, msg);
      }, {
        noAck: true
      });
    });
};

module.exports = Queue;