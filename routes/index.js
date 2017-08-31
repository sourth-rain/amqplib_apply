const express = require('express');
const router = express.Router();
const queueService = require('../service/mq');
const Queue = new queueService('reqQueue',{});
const QueueOther = new queueService('resQqueue',{});
/* GET home page. */
router.get('/', function(req, res ) {
  return Queue.sendToQueue('lalalalala').then(function(result){
    if(!result){
      throw('消息发送失败！');
    }
    return QueueOther.consume(function(data){
      if(!data){
        return QueueOther.consume();
      }
      return res.json({tag:'success',data:data});
    })
  })
});

module.exports = router;
