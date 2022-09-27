const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const fs = require("fs");

module.exports = class ICorsi {
  cookies;
  session;

  async init(sess) {
    this.session = sess.session;
    this.cookies = sess.cookies;
  }

  async login(username, password) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(
      "https://www.icorsi.ch/Shibboleth.sso/Login?entityID=https%3A%2F%2Flogin2.supsi.ch%2Fidp%2Fshibboleth&target=https%3A%2F%2Fwww.icorsi.ch%2Fauth%2Fshibboleth%2F"
    );
    await page.type("#username", username);
    await page.type("#password", password);
    let elHandleArray = await page.$$("button");
    let elHandle = elHandleArray[0];
    await elHandle.click();
    await page.waitForSelector("#actionmenuaction-6", { timeout: 5000 });
    this.cookies = await page.cookies();
    await browser.close();
    await this.getSession();
    await this.exportSession();
  }

  async getSession() {
    let res = await fetch("https://www.icorsi.ch/my/", {
      headers: {
        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
    });
    let body = await res.text();
    this.session = JSON.parse(body.split("M.cfg = ")[1].split(";")[0]);
    return this.session.sesskey;
  }

  async getCourses() {
    let res = await fetch(
      `https://www.icorsi.ch/lib/ajax/service.php?sesskey=${this.session.sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`,
      {
        headers: {
          Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
        },
        body: '[{"index":0,"methodname":"core_course_get_enrolled_courses_by_timeline_classification","args":{"offset":0,"limit":0,"classification":"all","sort":"fullname","customfieldname":"","customfieldvalue":""}}]',
        method: "POST",
      }
    );
    let courses = await res.json();
    if (courses[0].error) return [];
    return courses[0].data.courses;
  }

  async getCourseAttedancesLink(id) {
    let res = await fetch(`https://www.icorsi.ch/course/view.php?id=${id}`, {
      headers: {
        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
    });
    let body = await res.text();
    let attedances = body.match(
      /https:\/\/www.icorsi.ch\/mod\/attendance\/view.php\?id=[0-9]+/g
    );
    return attedances == null ? false : attedances;
  }

  async getEvents() {
    let res = await fetch(
      `https://www.icorsi.ch/lib/ajax/service.php?sesskey=${this.session.sesskey}&info=core_calendar_get_action_events_by_timesort`,
      {
        headers: {
          Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
        },
        body: '[{"index":0,"methodname":"core_calendar_get_action_events_by_timesort","args":{"limitnum":26,"timesortfrom":1648677600,"limittononsuspendedevents":true}}]',
        method: "POST",
      }
    );
    let events = await res.json();
    if (courses[0].error) return [];
    return events[0].data.events;
  }

  async exportSession(filename) {
    if (!filename) {
      filename = "session.json";
    }
    await fs.writeFileSync(
      filename,
      JSON.stringify({ session: this.session, cookies: this.cookies })
    );
  }

  async getAttendanceSessid(link) {
    let res = await fetch(link, {
      headers: {
        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
    });
    //read page content from res
    let body = await res.text();
    //extract from content "https://www.icorsi.ch/mod/attendance/attendance.php?sessid=29800"
    let extractedString = body.match(/https:\/\/www.icorsi.ch\/mod\/attendance\/attendance.php\?sessid=[0-9]+/g);
    if (extractedString == null) return null;
    if (extractedString.length == 0) return null;
    if (extractedString.length > 1) return null;
    if (extractedString[0] == null) return null;
    if (extractedString[0].length == 0) return null;
    let sessid = extractedString[0].split("=")[1]
    return sessid;
  }

  async submitAttendace(sessId) {
    let res = await fetch("https://www.icorsi.ch/mod/attendance/attendance.php", {
      "headers": {
        "content-type": "application/x-www-form-urlencoded",
        "Referer": `https://www.icorsi.ch/mod/attendance/attendance.php?sessid=${sessId}&sesskey=${this.session.sesskey}`,
        "Referrer-Policy": "strict-origin-when-cross-origin",
        Cookie: this.cookies.map((c) => `${c.name}=${c.value}`).join("; "),
      },
      body: `sessid=${sessId}&sesskey=${this.session.sesskey}&sesskey=${this.session.sesskey}&_qf__mod_attendance_form_studentattendance=1&mform_isexpanded_id_session=1&status=663&submitbutton=Save+changes`,
      method: "POST"
    });
    return true;
  }
};
