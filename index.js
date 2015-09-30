#!/usr/bin/env node
/*jslint node: true */

var fs = require('fs');
var mongo = require('mongodb');
var safe = require('safe');
var _ = require('lodash');
var path = require('path');
var yarg = require('yargs')
    .usage('Mongo Index enSURE\n\n$0 command [options]')
    .option( "h", { alias: "host", demand: false, describe: "Hostname", type: "string" })
    .option( "d", { alias: "db",   demand: false, describe: "Database", type: "string" })
    .option( "port", { demand: false, describe: "Port", type: "string" })
    .option( "a", { alias: "auth", demand: false, describe: "Authentication", type: "boolean" })
    .option( "u", { alias: "user", demand: false, describe: "Username", type: "string" })
    .option( "p", { alias: "password", demand: false, describe: "Password", type: "string" })
    .option( "config", { demand: false, describe: "JSON file with db information", type: "string" })
    .command("capture", "Captures (reads) db infomration")
    .command("update", "Updates database based on --config file")
    .command("check", "Check for required updates based on --config file")
    .help( "?" )
    .alias( "?","help")
    .default({
        "port": 27017,
        "a" : true,
        "config" : "./misure.json"
    });

var arg = yarg.argv;

var Db = function(arg){
    var self = this;
    self.conf = arg;
    self.name_collections = null;
    self.collections = [];
    self.indexes = {};
    self.opt_ensure = null;
    self.misureIndex = {};
    self.opt_ensure = null;

    self.getDb = function(cb){
        // console.log("Connecting to: " + JSON.stringify(self.conf));
        var dbc = new mongo.Db(
            self.conf.db,
            new mongo.Server(self.conf.host, self.conf.port),
            {native_parser: false, safe:true, maxPoolSize: 100} );

        dbc.open(safe.sure(cb,function(_db) {
            db = _db;
            if (! self.conf.auth) {
                cb();
            } else {
                db.authenticate(self.conf.user, self.conf.password, safe.sure(cb, function() {
                    // console.log("authenticate");
                    cb();
                }));
            }
        }));
    };

    self.getCollections = function(cb){
        db.listCollections().toArray(safe.sure(cb,function(res){
            _.each(res,function(elem){
                if (elem.name.indexOf("system."!==0))
                    self.collections.push(elem.name);
            });
            self.collections = self.collections.sort();
            cb();
        }));
    };

    self.showCollections = function(cb){
        console.log( "\nAll collecions ("+(self.collections.length+1)+"):\n\t"+self.collections.join("\n\t") );
        return cb();
    };

    self.getIndexes = function(cb){
        safe.eachSeries(self.collections,function(col,cb){
            db.indexInformation(col,safe.sure(cb,function(res){
                var obj = {};
                _.each(res,function(val,key){
                    // If key is _id, than next index. Because is default indexes.
                    if (key == '_id_')
                        return;

                    var arr_name = [];
                    var obj_key = _.reduce(val, function(memo,num){
                        arr_name.push(num[0],num[1]);
                        memo[ num[0] ] = num[1];
                        return memo;
                    },{});
                    var key_name = arr_name.join('_');
                    obj[key_name] = obj_key;
                });
                if(!_.isEmpty(obj))
                    self.indexes[col] = obj;
                cb();

            }));
        },cb);
    };

    self.checkIndex = function(cb){
        var not_found_col = [];

        console.log("");

        _.each(self.indexes,function(idx,col){
            if (!self.misureIndex[col]){
                not_found_col.push(col);
                return;
            }

            var idx_col = _.keys(idx);
            var idx_base = _.keys(self.misureIndex[col]);
            var diff_add = _.difference(idx_base,idx_col);
            var diff_drop = _.difference(idx_col,idx_base);
            self.updateIndexes = {};

            if (diff_add.length > 0 || diff_drop.length > 0){
                self.updateIndexes[col] = {"ensureIdx":[],"dropIdx":[],};
            }else {
                return;
            }

            if (diff_add.length > 0 || diff_drop.length > 0)
                console.log("---> "+col+"\n");
            if (diff_add.length > 0){
                self.updateIndexes[col].ensureIdx = _.map(diff_add,function(nam){ return self.misureIndex[col][nam];});
                console.log("\tEnsureIndexes:");
                _.each(self.updateIndexes[col].ensureIdx,function(nam){console.log("\t\t",nam);});
            }

            if (diff_drop.length > 0){
                self.updateIndexes[col].dropIdx = diff_drop;
                console.log("\tDropIndexes:");
                console.log("\t\t",diff_drop.join('\n\t\t'));
            }
        });
        if (not_found_col.length>0) {
            console.log("\nCollecions not found:\n"+not_found_col.join("\n"));
        }
        cb();
    };

    self.showIndexes = function(cb){
        var strIndex = JSON.stringify({indexes:self.indexes},null,'\t');
        console.log(strIndex);
        cb();
    };

    self.updateIndex = function(cb){
        safe.eachSeries(_.keys(self.updateIndexes),function(col,cb){
            var dropIdx = self.updateIndexes[col].dropIdx;
            var ensureIdx = self.updateIndexes[col].ensureIdx;

            safe.eachSeries(dropIdx,function(Idx,cb){
                db.dropIndex(col,Idx,safe.sure(cb,function(res){
                    console.log("Drop "+col+"."+Idx+" -> ",res.ok==1?"Ok":"Fail");
                    cb();
                }));
            },safe.sure(cb,function(){
                safe.eachSeries(ensureIdx,function(Idx,cb){
                    db.ensureIndex(col,Idx,self.opt_ensure,safe.sure(cb,function(res){
                        console.log("Ensure "+col+"."+res);
                        cb();
                    }));
                },cb);
            }));
        },cb);
    };

    self.exit = function(err){
        if (err) {
            console.trace(err);
        }
        process.exit(1);
    };

    self.cmdCollections = function(){
        var command = [
            self.getDb,
            self.getCollections,
            self.showCollections
        ];
        safe.waterfall(command,self.exit);
    };

    self.cmdIndexes = function(){
        var command = [
            self.getDb,
            self.getCollections,
            self.getIndexes,
            self.showIndexes
        ];
        safe.waterfall(command,self.exit);
    };

    self.cmdCheck = function(){
        if (_.isEmpty(self.misureIndex)) {
            console.log("Not found files for indexes");
            return;
        }
        var command = [
            self.getDb,
            self.getCollections,
            self.getIndexes,
            self.checkIndex
        ];
        safe.waterfall(command,self.exit);
    };

    self.cmdUpdate = function(){
        if (_.isEmpty(self.misureIndex)) {
            console.log("Not found files for indexes");
            return;
        }
        var command = [
            self.getDb,
            self.getCollections,
            self.getIndexes,
            self.checkIndex,
            self.updateIndex
        ];
        safe.waterfall(command,self.exit);
    };
};
var db = new Db(arg);

var readFile = function(){
    try {
        misureIndex = fs.readFileSync(path.resolve(arg.config),'utf8').toString();
        misureIndex = JSON.parse(misureIndex).indexes;
    } catch (e) {
        console.log("\nError: Cannot load/parse --config file\n");
        yarg.showHelp();
        process.exit(1);
    }
    db.misureIndex = misureIndex || {};
};

function start(){
    db.name_collections = arg.coll || null;

    if (arg._.length==1 && arg._[0] =="capture") {
        db.cmdIndexes();
    } else if (arg._.length==1 && arg._[0] =="check") {
        if(arg.config){
            readFile();
            db.cmdCheck();
        } else {
            console.log("Please specify --config file to use");
        }
    } else if (arg._.length==1 && arg._[0] =="update") {
        if(arg.config){
            readFile();
            db.cmdUpdate();
        } else {
            console.log("Please specify --config file to use");
        }
    } else {
        console.log("\nError: Unknown or missing command\n");
        yarg.showHelp();
    }

}

start();
