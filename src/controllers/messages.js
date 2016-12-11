/*
      .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    11/24/2016
 Author:     Chris Brame

 **/

var _       = require('underscore'),
    async   = require('async'),
    winston = require('winston'),
    userSchema = require('../models/user'),
    conversationSchema = require('../models/chat/conversation'),
    messageSchema = require('../models/chat/message');

var messagesController = {};

messagesController.content = {};

messagesController.get = function(req, res, next) {
    var self = this;
    self.content = {};
    self.content.title = "Messages";
    self.content.nav = 'messages';
    self.content.data = {};
    self.content.data.user = req.user;
    self.content.data.common = req.viewdata;
    self.content.data.conversations = [];

    conversationSchema.getConversationsWithLimit(req.user._id, undefined, function(err, convos) {
        if (err) {
            winston.debug(err);
            return handleError(res, err);
        }

        async.eachSeries(convos, function(convo, done) {
            var c = convo.toObject();
            messageSchema.getMostRecentMessage(c._id, function(err, rm) {
                if (err) return done(err);

                _.each(c.participants, function(p) {
                    if (p._id.toString() !== req.user._id.toString())
                        c.partner = p;
                });

                rm = _.first(rm);

                if (!_.isUndefined(rm)) {
                    if (String(c.partner._id) == String(rm.owner._id)) {
                        c.recentMessage = c.partner.fullname + ': ' + rm.body;
                    } else {
                        c.recentMessage = 'You: ' + rm.body
                    }

                    self.content.data.conversations.push(c);
                }

                return done();
            })
        }, function(err) {
            if (err) {
                winston.debug(err);
                return handleError(res, err);
            }

            return res.render('messages', self.content);
        });
    });
};

messagesController.getConversation = function(req, res, next) {
    var self = this;
    var cid = req.params.convoid;
    if (_.isUndefined(cid)) return handleError(res, 'Invalid Conversation ID!');

    self.content = {};
    self.content.title = "Messages";
    self.content.nav = 'messages';
    self.content.data = {};
    self.content.data.user = req.user;
    self.content.data.common = req.viewdata;
    self.content.data.conversations = [];

    async.parallel([
        function(next) {
            conversationSchema.getConversationsWithLimit(req.user._id, undefined, function(err, convos) {
                if (err) return next(err);

                async.eachSeries(convos, function(convo, done) {
                    var c = convo.toObject();
                    messageSchema.getMostRecentMessage(c._id, function(err, rm) {
                        if (err) return done(err);

                        _.each(c.participants, function(p) {
                            if (p._id.toString() !== req.user._id.toString())
                                c.partner = p;
                        });

                        rm = _.first(rm);

                        if (!_.isUndefined(rm)) {
                            if (String(c.partner._id) == String(rm.owner._id)) {
                                c.recentMessage = c.partner.fullname + ': ' + rm.body;
                            } else {
                                c.recentMessage = 'You: ' + rm.body
                            }

                            self.content.data.conversations.push(c);
                        }

                        return done();
                    })
                }, function(err) {
                    if (err) return next(err);

                    return next();
                });
            });
        },
        function(next) {
            self.content.data.page = 2;

            conversationSchema.getConversation(cid, function(err, convo) {
                if (err) return next(err);

                if (convo == null || convo == undefined)
                    return res.redirect('/messages');

                var c = convo.toObject();
                messageSchema.getConversationWithObject({cid: c._id}, function(err, messages) {
                    if (err) return next(err);

                    _.each(c.participants, function(p) {
                        if (p._id.toString() !== req.user._id.toString()) {
                            c.partner = p;
                        }
                    });

                    self.content.data.conversation = c;
                    self.content.data.conversation.messages = messages.reverse();

                    return next();
                })
            });
        }
    ], function(err) {
        if (err) return handleError(res, err);
        return res.render('messages', self.content);
    });
};

//
// messagesController.getSentItems = function(req, res, next) {
//     var self = this;
//     self.content = {};
//     self.content.title = "Messages";
//     self.content.nav = 'messages';
//     self.content.subnav = 'messages-sentitems';
//     self.content.folder = "Sent Items";
//     self.content.folderNum = 1;
//     //Setup Data
//     self.content.data = {};
//     self.content.data.user = req.user;
//     self.content.data.common = req.viewdata;
//
//
//     var messages = require('../models/message');
//     self.content.data.messages = {};
//     async.parallel([
//             function(callback) {
//                 messages.getUserFolder(req.user._id, 1, function(err, objs) {
//                     self.content.data.messages.items = objs;
//                     self.content.data.messages.count = _.size(objs);
//
//                     callback(err, objs);
//                 });
//             }
//         ],
//         function(err, results) {
//             res.render('messages', self.content);
//         });
//
// };
//
// messagesController.getTrashItems = function(req, res, next) {
//     var self = this;
//     self.content = {};
//     self.content.title = "Messages";
//     self.content.nav = 'messages';
//     self.content.subnav = 'messages-trash';
//     self.content.folder = "Trash";
//     self.content.folderNum = 2;
//     self.content.data = {};
//     self.content.data.user = req.user;
//     self.content.data.common = req.viewdata;
//
//
//     var messages = require('../models/message');
//     self.content.data.messages = {};
//     async.parallel([
//             function(callback) {
//                 messages.getUserFolder(req.user._id, 2, function(err, objs) {
//                     self.content.data.messages.items = objs;
//                     self.content.data.messages.count = _.size(objs);
//
//                     callback(err, objs);
//                 });
//             }
//         ],
//         function(err, results) {
//             res.render('messages', self.content);
//         });
//
// };
//
// messagesController.getById = function(req, res, next) {
//     var self = this;
//     self.content = {};
//     self.content.title = "Messages";
//     self.content.nav = 'messages';
//     self.content.subnav = 'messages-inbox';
//     self.content.folder = "Inbox";
//     self.content.folderNum = 0;
//     self.content.data = {};
//     self.content.data.user = req.user;
//     self.content.data.common = req.viewdata;
//
//
//     var messages = require('../models/message');
//     self.content.data.messages = {};
//     async.parallel([
//             function(callback) {
//                 messages.getUserFolder(req.user._id, 0, function(err, objs) {
//                     self.content.data.messages.items = objs;
//                     self.content.data.messages.count = _.size(objs);
//
//                     callback(err, objs);
//                 });
//             },
//             function(callback) {
//                 messages.getMessageById(req.params.id, function(err, obj) {
//                     self.content.data.messages.message = obj;
//
//                     callback(err, obj);
//                 });
//             }
//         ],
//         function(err, results) {
//             if (err) {
//                 throw new Error(err);
//             }
//
//             res.render('messages', self.content);
//         });
// };

function handleError(res, err) {
    if (err) {
        winston.warn(err);
        if (!err.status) res.status = 500;
        else res.status = err.status;
        return res.render('error', {layout: false, error: err, message: err.message});
    }
}

module.exports = messagesController;