const gulp = require('gulp')

gulp.task('clean', () =>
    gulp.src('build/', {read: false}).pipe(require('gulp-clean')())
)
gulp.task('build', ['clean'], () => {
    require('nodemon')({
        script: 'src/app.js',
        env: { 'NODE_ENV': 'development' }
    }).on('start', () => {
        gulp.start('watch')
    })
})

gulp.task('watch', () => {
    gulp.watch(['src/**/*.js'], ['clean'])
})

gulp.task('default', ['build'])