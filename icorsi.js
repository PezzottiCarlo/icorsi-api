const fetch = require('node-fetch');
const puppeteer = require('puppeteer');

module.exports = class ICorsi {

    session;
    sessionInfo;

    async login(username, password) {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.icorsi.ch/Shibboleth.sso/Login?entityID=https%3A%2F%2Flogin2.supsi.ch%2Fidp%2Fshibboleth&target=https%3A%2F%2Fwww.icorsi.ch%2Fauth%2Fshibboleth%2F');
        await page.type('#username', username);
        await page.type('#password', password);
        let elHandleArray = await page.$$('button')
        let elHandle = elHandleArray[0]
        await elHandle.click();
        await page.waitForSelector("#actionmenuaction-6",{timeout:5000})
        let cookies = await page.cookies();
        await browser.close();
        this.session = cookies;
        return await this.getSessInfo();
    }

    async getSessInfo() {
        let res = await fetch('https://www.icorsi.ch/my/', {
            headers: {
                'Cookie': this.session.map(c => `${c.name}=${c.value}`).join('; ')
            }
        })
        let body = await res.text();
        this.sessionInfo = JSON.parse(body.split("M.cfg = ")[1].split(";")[0]);
        return (this.sessionInfo.sesskey) 
    }

    async getCourses() {
        let res = await fetch(`https://www.icorsi.ch/lib/ajax/service.php?sesskey=${this.sessionInfo.sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`, {
            "headers": {
                'Cookie': this.session.map(c => `${c.name}=${c.value}`).join('; ')
            },
            "body": "[{\"index\":0,\"methodname\":\"core_course_get_enrolled_courses_by_timeline_classification\",\"args\":{\"offset\":0,\"limit\":0,\"classification\":\"all\",\"sort\":\"fullname\",\"customfieldname\":\"\",\"customfieldvalue\":\"\"}}]",
            "method": "POST"
        });
        let courses = await res.json();
        return courses[0].data.courses;
    }

    async getCourseAttedancesLink(id) {
        let res = await fetch(`https://www.icorsi.ch/course/view.php?id=${id}`, {
            "headers": {
                'Cookie': this.session.map(c => `${c.name}=${c.value}`).join('; ')
            }
        })
        let body = await res.text();
        let attedances = body.match(/href="https:\/\/www.icorsi.ch\/mod\/attendance\/view.php\?id=[0-9]+"/g);
        return (attedances==null)?[]:attedances;
    }
}
