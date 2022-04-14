const ICorsi = require('./icorsi.js');

async function main(){
    let icorsi = new ICorsi();
    let username = process.argv[2];
    let password = process.argv[3];
    console.log("Logging in...");
    if(await icorsi.login(username, password)){
        console.log("Logged in!");
        let courses = await icorsi.getCourses();
        console.log(courses.length)
        for(let course of courses){
            console.log(course.fullname);
            let attedances = await icorsi.getCourseAttedancesLink(course.id);
            for(let attedance of attedances){
                console.log(attedance);
            }
        }
    }else{
        console.log("Login failed");
    }
}

main();