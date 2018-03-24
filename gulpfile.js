const gulp = require('gulp')

const invalidateEnv = () => {
    const fs = require('fs')
    if (fs.existsSync('.env')) return

    fs.writeFileSync('.env', 'BUILD_DIR=../guildmaster/Assets/Script/gen/')
}

gulp.task('clean', () => {
    invalidateEnv()
    require('dotenv').config()
    
    return require('del').sync([process.env.BUILD_DIR], {force: true}, () => {});
    // return 
    //     gulp.src(process.env.BUILD_DIR, {read: false})
    //     .pipe(require('gulp-clean')({force:true}))
})

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