

var path = require('path');
var stream = require('stream');
var VinylFile = require('vinyl');

var gulpJsResource = module.exports = {};

var OUTPUT_FILE_HEADER = '// GENERATED FILE (gulp-js-inline-resource)\n';


/**
 * @param {{
 *     closureProvideSymbol: (string|undefined),
 *     symbol: (string|undefined)
 *   }=} opts 
 * @return {stream.Transform}
 */
gulpJsResource.single = function(opt_opts) {
  var opts = opt_opts || {};
  var transformStream = new stream.Transform({objectMode: true});
  /** @type {VinylFile} */
  var inputFile;

  /**
   * @param {VinylFile} file
   * @param {string=} encoding - ignored if file contains a Buffer
   * @param {function(Error, object)} callback
   */
  transformStream._transform = function(file, encoding, callback) {
    if (inputFile) {
      callback(new Error('More than one input file.'));
    } else {
      inputFile = file;
      callback();      
    }
  };

  /**
   * @param {function(Error)} callback
   */
  transformStream._flush = function(callback) {
    var out = [OUTPUT_FILE_HEADER];

    if (opts.closureProvideSymbol) {
      out.push('goog.provide(\'', opts.closureProvideSymbol, '\');\n');
      var lhs = opts.closureProvideSymbol;
    } else if (opts.symbol) {
      var lhs = 'var ' + opts.symbol;
    } else {
      callback(new Error('No symbol name provided.'));
    }
    var typeAnnotation = '/** @type {string} */\n';
    var rhs = JSON.stringify(inputFile.contents.toString(), undefined, 2);
    out.push(typeAnnotation, lhs, ' = ', rhs, ';\n');

    var outputStr = out.join('');

    var outputFile = new VinylFile({
        contents: new Buffer(outputStr, 'utf8'),
        // NOTE: The basename-property of vinyl file instances doesn't seem
        // to get populated for some reason.
        path: path.basename(inputFile.path) + '.js',
      });

    this.push(outputFile);
    callback();
  };

  return transformStream;  
};


/**
 * @param {{
 *     closureSymbol: (string,undefined),
 *     symbol: (string,undefined),
 *     fileName: string
 *   }=} opt_opts
 * @return {stream.Transform}
 */
gulpJsResource.multiple = function(opt_opts) {
  var opts = opt_opts || {};
  var transformStream = new stream.Transform({objectMode: true});
  /** @type {Array.<VinylFile>} */
  var inputFiles = [];

  /**
   * @param {VinylFile} file
   * @param {string=} encoding - ignored if file contains a Buffer
   * @param {function(Error, object)} callback
   */
  transformStream._transform = function(file, encoding, callback) {
    inputFiles.push(file);
    callback();
  };

  /**
   * @param {function(Error)} callback
   */
  transformStream._flush = function(callback) {
    var out = [OUTPUT_FILE_HEADER];

    if (opts.closureProvideSymbol) {
      out.push('goog.provide(\'', opts.closureProvideSymbol, '\');\n');
      var lhs = opts.closureProvideSymbol;
    } else if (opts.symbol) {
      var lhs = 'var ' + opts.symbol;
    } else {
      callback(new Error('No symbol name provided.'));
    }

    var typeAnnotation = '/** @type {Object.<string,string>} */\n';
    var dict = {};
    for (var i = 0, inputFile; inputFile = inputFiles[i]; i++) {
      var name = path.basename(inputFile.path);
      if (name in dict) {
        callback(new Error('File name collision: ' + name));
        return;
      }
      dict[name] = inputFile.contents.toString();
    };
    var rhs = JSON.stringify(dict, undefined, 2);
    out.push(typeAnnotation, lhs, ' = ', rhs, ';\n');

    var outputStr = out.join('');
    var outputFile = new VinylFile({
        contents: new Buffer(outputStr, 'utf8'),
        path: opts.fileName,
      });

    this.push(outputFile);
    callback();
  };

  return transformStream;
};

