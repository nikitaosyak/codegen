const gulp = require('gulp')

gulp.task('clean', () => {
    const clean = require('gulp-clean')
    return gulp.src('build/', {read: false}).pipe(clean())
})

gulp.task('generate', ['clean'], () => {
    const nodemon = require('nodemon')
    const ndStream = nodemon({
        script: 'app.js',
        cmd: './',
        ext: 'js, template, cdb',
        env: {NODE_ENV: 'DEVELOPMENT'}
    })

    ndStream.on('crash', () => {
        console.error('app crashed.. restarting soon\n')
        ndStream.emit('restart', 2)
    }).on('restart', () => {console.log('restarting')})
})

gulp.task('default', ['clean', 'generate'])