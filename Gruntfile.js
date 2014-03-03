var refInsertMarkers = ['<!----FILE LINKS-->', '<!----END FILE LINKS-->'];
var fileLinks =
'<script type="text/javascript">{DATAVARS}</script>\
<script type="text/javascript">{CSVDATA}</script>\
<script type="text/javascript">{SCRIPTS}</script>\
<style>{STYLES}</style>'

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                banner: '/*\n' +
                ' * ' + '<%= pkg.name %>\n' +
                ' * ' + 'v<%= pkg.version %>\n' +
                ' * ' + '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                ' **/\n'
            },

            main: {
                files: {
                    'Build/Scripts.min.js':
                        [
                            'OrbitControls.js',
                            'raphael.js',
                            'Data.js',
                            'Global.js',
                            'Census.js',
                            '3DScene.js',
                            'Selection.js',
                            'Script.js'
                        ],
                    'Build/Variables.min.js':
                        [
                            'Build/Variables.js'
                        ]
                }
            }
        },

        copy: {
            main: {
                options: {
                    process: function (content, srcpath) {
                        var result = content.split('');

                        var currString = result.join('');
                        var start = currString.indexOf(refInsertMarkers[0]);
                        var end = currString.indexOf(refInsertMarkers[1]) + refInsertMarkers[1].length;
                        result.splice(start, end - start);

                        var scripts = fileLinks;

                        scripts = scripts.replace('{SCRIPTS}', grunt.file.read('Build/Scripts.min.js'));
                        scripts = scripts.replace('{STYLES}', grunt.file.read('Build/Styles.min.css'));
                        scripts = scripts.replace('{DATAVARS}', grunt.file.read('Build/Variables.min.js'));

                        var escapedCountyData = grunt.file.read('Data/CountyData.txt').replace(/\n/g, '\\n');
                        var escapedStateData = grunt.file.read('Data/StateData.csv').replace(/\n/g, '\\n');

                        scripts = scripts.replace('{CSVDATA}', 'var preloadedCountyData = "' + escapedCountyData + '"; var preloadedStateData = "' + escapedStateData + '";');

                        result.splice(start, 0, scripts);
                        var splicedString = result.join('');

                        return splicedString;
                    }
                },

                files: [
                  { expand: true, src: ['Index.html'], dest: 'Build/' },
                ]
            },
            data: {
                src: 'Data/*',
                dest: 'Build/',
            },
        },

        cssmin: {
            minify: {
                expand: true,
                src: ["Styles.css"],
                dest: 'Build/',
                ext: '.min.css'
            }
        },

        concat: {
            main: {
                options: {
                    process: function (src, file) {
                        return 'if(typeof preloadedInitProps == "undefined") {preloadedInitProps = {};}; preloadedInitProps["' + file + '"] = ' + src + ';\n';
                    }
                },

                files: {
                    'Build/Variables.js':
                        [
                            'Data/Variables2010acs5.js',
                            'Data/Variables2010sf1.js'
                        ]
                },
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', function () {
        grunt.task.run('concat')
        grunt.task.run('uglify');
        grunt.task.run('cssmin');
        grunt.task.run('copy');
    });

}