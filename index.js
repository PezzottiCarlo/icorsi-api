const ICorsi = require("./icorsi.js");
const fs = require("fs");

async function main() {
  let icorsi = new ICorsi();
  let username = "carlo.pezzotti@student.supsi.ch";
  let password = process.env.icorsiPass;
  console.log("Logging in...");
  //await icorsi.init(JSON.parse(fs.readFileSync("session.json")));
  await icorsi.login(username, password);
  console.log("Logged in!");
  let courses = await icorsi.getCourses();
  console.log("Courses: " + courses.length);
  for (let i = 0; i < courses.length; i++) {
    console.log("Name: \t" + courses[i].fullname);
    console.log("Id: \t" + courses[i].id);
    let attendanceLink = await icorsi.getCourseAttedancesLink(courses[i].id);
    if (attendanceLink) {
      console.log("Attendance: \t" + attendanceLink);
      let sessId = await icorsi.getAttendanceSessid(attendanceLink);
      if (sessId) {
        console.log("Attendance id \t" + sessId);
        console.log("https://www.icorsi.ch/mod/attendance/attendance.php?sessid=" + sessId);
        await icorsi.submitAttendace(sessId);
      }
    }
    console.log("\n\n");
  }
}
main();
