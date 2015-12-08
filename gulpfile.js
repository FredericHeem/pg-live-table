var gulp = require( 'gulp' );
var runSequence = require( 'run-sequence' );
var del = require( 'del' );
var babel = require('gulp-babel');

var paths = {
  source: ['src/**/*.js'],
  build: 'build'
};

gulp.task( 'default', [ 'build' ] );

gulp.task('build', function () {
    return gulp.src(paths.source)
        .pipe(babel())
        .pipe(gulp.dest(paths.build));
});

gulp.task( 'build:production', function ( done ) {
    runSequence(
        'clean:build',
        'build',
        done
    );
} );

gulp.task( 'clean:build', function () {
  return del([paths.build]);
} );
