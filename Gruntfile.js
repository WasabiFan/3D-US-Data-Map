
module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        copy: {
            main: {
                src: '**',
                dest: 'Build/',
            }
        },

        'gh-pages': {
            main: {
                options: {
                    base: 'Build'
                },
                src: '**'
            },
			secondary: {
                options: {
                    base: 'Build',
					repo: 'https://github.com/datamap/datamap.github.io.git',
					add:true,
					branch: 'master'
                },
                src: '**'
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-gh-pages');

    grunt.registerTask('default', function () {
        grunt.task.run('copy');
    });

    grunt.registerTask('publish', function () {
        grunt.task.run('gh-pages');
    });
}
