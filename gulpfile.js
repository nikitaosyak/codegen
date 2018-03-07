const gulp = require('gulp')

gulp.task('clean', () =>
    gulp.src('build/', {read: false}).pipe(require('gulp-clean')())
)
gulp.task('build', ['clean'], () =>
    require('child_process').exec('node ./src/app.js', (_, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
    })
)

gulp.task('watch', () => {
    gulp.watch(['src/**/*.js', 'db/source.cdb', 'templates/**/*.ejs'], ['build'])
})

gulp.task('default', ['build', 'watch'])