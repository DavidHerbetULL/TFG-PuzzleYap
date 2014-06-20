/*global module*/
module.exports = function (grunt) {

  'use strict';
  
  // Project configuration.
  grunt.initConfig({
    
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      build: {
        files: [{
          expand: true,     // Enable dynamic expansion.
          cwd: 'js/',      // Src matches are relative to this path.
          src: ['**/*.js'], // Actual pattern(s) to match.
          dest: 'build/js/'   // Destination path prefix.
          //ext: '.min.js',   // Dest filepaths will have this extension.
          //extDot: 'first'   // Extensions in filenames begin after the first dot
        }]
      }
    },

    copy: {
      main: {
        src: ['index.html', 'resources/**/*'],
        dest: 'build/'
      }
    },

    compress: {
      main: {
        options: {
          mode: 'zip',
          archive: './CocoonJSLauncher/<%= pkg.name %>-v<%= pkg.version %>.zip'
        },
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['**/*'],
          filter: 'isFile'
        }]
      }
    },

    clean: {
      build: ['build']
    },

    watch: {
      files: ['index.html', 'resources/**/*', 'js/**/*'],
      tasks: ['uglify', 'copy', 'compress']
    }

  });

  // Load the plugins that provides the diferent tasks.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['uglify', 'copy', 'compress']);
  grunt.registerTask('uglifyFiles', ['uglify']);
  grunt.registerTask('copyFiles', ['copy']);
  grunt.registerTask('compressFiles', ['compress']);
  grunt.registerTask('cleanBuild', ['clean']);

};
