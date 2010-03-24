/*
 * Copyright (c) 2010 Edward Benson
 *
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 * */

var filecache = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("filecache-strings");
  },
  onMenuItemCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
  }
};
window.addEventListener("load", function(e) { filecache.onLoad(e); }, false);


var databaseSaver = {  
  // Directory to save sessions (nsILocalFile)  
  // _dir: null,  
  // // Initialization  
  // init: function() { 
  //     var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
  //     .getService(Components.interfaces.nsIProperties);  
  //     this._dir = dirSvc.get("ProfD", Components.interfaces.nsILocalFile); 
  //     this._dir.append("sessionstore"); 
  //     if (!this._dir.exists()) 
  //        this._dir.create(this._dir.DIRECTORY_TYPE, 0700);  
  // },  
  // uninit: function() { 
  //     this._dir = null;  
  // },  

  fileSizes:["5","500","1000","5000","10000","50000"],
  currentFileSize:0,

  strategies:2,
  currentStrategy:0,

  iterationsPerFile:3,
  currentIteration:0,
  logger:Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),

  time:0,
  logFile:null,
  converter:null,
  
  filePath:"~/bulkload-experiment/",
  
  beginTest:function(event) {
      event.stopPropagation();  

      var toFilename = "browser.csv";
      var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                      .createInstance(Components.interfaces.nsIWebBrowserPersist);
      databaseSaver.logFile = Components.classes["@mozilla.org/file/local;1"]
                                   .createInstance(Components.interfaces.nsILocalFile);

      databaseSaver.logFile.initWithPath(databaseSaver.filePath); // download destination
      databaseSaver.logFile.append(toFilename);

      // Remove the file if it exists
      if (databaseSaver.logFile.exists()) {
         databaseSaver.logFile.remove(false);          
      }
      //databaseSaver.logFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE,777);

      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].  
                               createInstance(Components.interfaces.nsIFileOutputStream);  
      try {
         foStream.init(databaseSaver.logFile, 0x04 | 0x08 | 0x20, 0777, 0);
      } catch(err) {
         alert(err.description);
      }

      // readwrite, create, truncate  
      // if you are sure there will never ever be any non-ascii text in data you can   
      // also call foStream.writeData directly  
      databaseSaver.converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].  
                                createInstance(Components.interfaces.nsIConverterOutputStream);  
      databaseSaver.converter.init(foStream, "UTF-8", 0, 0);  
      databaseSaver.runTestOnce();
  },
  logTime:function(t) {
     var str = databaseSaver.fileSizes[databaseSaver.currentFileSize] + "," + databaseSaver.currentStrategy + "," + databaseSaver.currentIteration + "," + t + '\n';
     databaseSaver.converter.writeString(str);  
  },
  incrementLoopVariables:function() {
      // alert("incrementLoopVariables");
      databaseSaver.currentIteration += 1;
      if (databaseSaver.currentIteration >= databaseSaver.iterationsPerFile) {
          // We've done all the iterations. Reset and change strategy
          databaseSaver.currentIteration = 0;
          
          databaseSaver.currentStrategy += 1;
          if (databaseSaver.currentStrategy >= databaseSaver.strategies) {
              // We've done all the strategies. Reset and change the file
              databaseSaver.currentStrategy = 0;
              
              databaseSaver.currentFileSize += 1;
              if (databaseSaver.currentFileSize >= databaseSaver.fileSizes.length) {
                  // We've done all the file sizes. Return false.
                  databaseSaver.converter.close(); // this closes foStream
                  alert("TEST DONE");
                  return false;
              }
          }          
          
      }
      return true;
  },
  runTestOnce: function() {
      /*
       * Setup parameters for the test
       */
      var urlPrefix  = "http://marcua.csail.mit.edu:7002/gzip-static/bulkload_"; 
      var sqliteSuffix  = ".sqlite"; 
      var jsonSuffix  = ".json"; 

      var fileSize = databaseSaver.fileSizes[databaseSaver.currentFileSize];
      // alert("runTestOnce -> Strategy " + databaseSaver.currentStrategy);
      if (databaseSaver.currentStrategy == 0) {
          // alert("Routing to SQLite");
          // SQLite
          var url = urlPrefix + fileSize + sqliteSuffix;
          databaseSaver.runSqliteTestOnce(url);
      }
      else if (databaseSaver.currentStrategy == 1) {
          // JSON
          // alert("Routing to JSON");
          var url = urlPrefix + fileSize + jsonSuffix;
          databaseSaver.runJsonTestOnce(url);
//          if (databaseSaver.incrementLoopVariables()) {
//              databaseSaver.runTestOnce();
//          }
      }
  },
  deleteFile:function(file) {
//      var file = Components.classes["@mozilla.org/file/local;1"]
//                                   .createInstance(Components.interfaces.nsILocalFile);
//      file.initWithPath(file); 
      if (file.exists()) {
          file.remove(false);
      }
  },
  runSqliteTestOnce: function(url) { 
      var ko = new Date();
      var ji = ko.getTime();
      //var toFilename = ji + ".sqlite";
      var toFilename = "testdb.sqlite";

      var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                      .createInstance(Components.interfaces.nsIWebBrowserPersist);
      var file = Components.classes["@mozilla.org/file/local;1"]
                                   .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(databaseSaver.filePath + toFilename); // download destination
      databaseSaver.deleteFile(file);
      var downloadHandler = function() {
        var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                .getService(Components.interfaces.mozIStorageService);  
        var mDBConn;
        try {
          mDBConn = storageService.openDatabase(file);
        } catch (e) {
          alert('sqlite open failed: ' + e.message + ' for file size ' + databaseSaver.fileSizes[databaseSaver.currentFileSize]);
        }
        
        var time2 = (new Date).getTime();
        var time1 = databaseSaver.time;
        databaseSaver.time = 0;

        databaseSaver.logTime(time2-time1);
        mDBConn.close();
        if (databaseSaver.incrementLoopVariables()) {
            databaseSaver.runTestOnce();
        }
      };
     persist.progressListener = {
        onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
            if (aCurTotalProgress == aMaxTotalProgress) {

            }
        },
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
            if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
                downloadHandler();
            }
        }
      };
      persist.persistFlags |= ~Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_NO_CONVERSION;
      var obj_URI = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService)
                      .newURI(url, null, null);

      databaseSaver.time = (new Date).getTime();
      persist.saveURI(obj_URI, null, null, null, "", file);
  },
  runJsonTestOnce:function(url) {
      var ko = new Date();
      var ji = ko.getTime();
//      var filename = ji + ".sqlite";
      var filename = "testdb.sqlite";
      var file = Components.classes["@mozilla.org/file/local;1"]
                                   .createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(databaseSaver.filePath + filename); // download destination
      databaseSaver.deleteFile(file);

      databaseSaver.time = (new Date).getTime();
      jQuery.get(url, function(results) {
          var storageService = Components.classes["@mozilla.org/storage/service;1"]  
                                         .getService(Components.interfaces.mozIStorageService); 
          var db;
          try {
              db = storageService.openDatabase(file);
          } catch (e) { 
            alert('json db open error: ' + e.name + ' message: ' + e.message);
          }
          
          var insert = "INSERT INTO noise VALUES (";
          var create = "CREATE TABLE noise(";
          for (var col = 0; col < results[0].length; col++) {
              var index  = col + 1;
              insert += "?" + index + ", " ;
              create += "var" + index + " VARCHAR(255), ";
          }
          insert = insert.substr(0, insert.length - 2);
          create = create.substr(0, create.length - 2);
          insert += ");";
          create += ");";

          var cStmt;
          try {
              cStmt = db.createStatement(create);
          } catch (e) { 
              alert('create bug: ' + db.lastErrorString);
          }

          // successFunc returns a function which you can pass to mozStorage's handleCompletion:
          //   it prints badmsg on failure, or calls goodFunc on success.
          var successFunc = function(badmsg, goodFunc) {
            var dbFunc = function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) { 
                    print(badmsg);  
                } else {
                    goodFunc();
                }
            };
            return dbFunc;
          };
          var iStmt;
          // Call once inserts are done.
          var insertFunc = successFunc("Inserts failed!", function() {
              iStmt.finalize();
              var time2 = (new Date).getTime();
              var time1 = databaseSaver.time;
              databaseSaver.time = 0;
              databaseSaver.logTime(time2-time1);
              // alert("JSON Test Finished")
              db.close();
              if (databaseSaver.incrementLoopVariables()) {
                  databaseSaver.runTestOnce();
              }
              
          });
          // Call once create is done.
          var createFunc = successFunc("Create failed!", function() {
              cStmt.finalize();
              try{
                  iStmt = db.createStatement(insert);
              } catch (e) { 
                  alert('create bug: ' + db.lastErrorString);
              }
              var params = iStmt.newBindingParamsArray();
              for (var rownum in results) {
                 var bp = params.newBindingParams();
                 var row = results[rownum];
                 for (var colnum in row) {
                     bp.bindByIndex(colnum, row[colnum]);
                 }
                 params.addParams(bp);
              }
              iStmt.bindParameters(params);
              db.executeAsync([iStmt], 1, {handleCompletion: insertFunc});
          });
          // execute create
          db.executeAsync([cStmt], 1, {handleCompletion: createFunc});
      }, "json");  // end AJAX request
  }  // end saveJSON
};

// The last 'true' allows unpriviledged javascript to access this handler
// document.addEventListener("SaveDatabaseEvent", databaseSaver.saveJSON, false, true);
document.addEventListener("SaveDatabaseEvent", databaseSaver.beginTest, false, true);
