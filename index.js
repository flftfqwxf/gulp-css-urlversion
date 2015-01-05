"use strict";

var path = require('path');
var crypto = require('crypto');
var fs = require('fs');

var gutil = require('gulp-util');
var through = require('through2');

var PLUGIN_NAME = 'gulp-css-urlversion';

function md5ify(data) {
  var hash = crypto.createHash("md5");
  hash.update(data);
  return hash.digest("hex");
}

module.exports = function(options) {
  options = options || {};
  var baseDir = options.baseDir || process.cwd();

  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return;
    }

    var incoming = file.contents.toString();

    var outgoing = incoming.replace(/url(\([\s]*(["'])[^\2\s]*\2\))|url(\([\s]*[^'"\s]*\))/g, function (str, dirtyUrl) {
        if (dirtyUrl===undefined) {
            dirtyUrl=arguments[3];
        }
      var url = dirtyUrl.trim().replace(/^\(/g,'').replace(/\)$/g,'').replace(/'|"/g, '');
      var replaceWithStr = null;
      if (url.indexOf("base64,") > -1 || url.indexOf("http://") > -1 ) {
        replaceWithStr = str; // ignoring base64 and external links
      } else {
        var imagePath = null;
        if(url.indexOf('/') === 0) { // root-relative url
          imagePath = path.join(baseDir, url);
        } else { // this path should be threated as relative
          gutil.log(PLUGIN_NAME + ': Using a relative path in ' + path.basename(file.path) + ": " + url);
          imagePath = path.resolve(path.dirname(file.path), url);
        }
          

        try {
          var idata = fs.readFileSync(imagePath);
          //must add quote mark ,because file name or dir has ")"
          replaceWithStr = 'url("' + url + "?v=" + md5ify(idata) + '")';
        } catch(err) {
          replaceWithStr = str;
          console.dir(file);
          this.emit('error', new gutil.PluginError(PLUGIN_NAME, err, {fileName: file.path}));
        }
      }

      return replaceWithStr;
    }.bind(this));

    try {
      file.contents = new Buffer(outgoing);
      this.push(file);
    } catch (err) {
      this.emit('error', new gutil.PluginError(PLUGIN_NAME, err, {fileName: file.path}));
    }

    cb();
  });
};
