const DB_DATA ={
  id: 0,
  tweetType: 1,
  content: 2,
  week: 3,
  time: 4,
  deleteSchedule: 5,
  state: 6
}

const ApiPath_prd = "https://5myu4svh0k.execute-api.ap-northeast-1.amazonaws.com"
const ApiPath_dev = "https://27txccoc2k.execute-api.ap-northeast-1.amazonaws.com"

function devFunction() {
  collectDBData('dev')
}
function prdFunction() {
  collectDBData('prd')
}

function collectDBData(stage) {
  const sheet = SpreadsheetApp.getActiveSheet()
  const lastrow = sheet.getLastRow()
  const values = sheet.getRange(`B3:H${lastrow}`).getValues()
  values.forEach((value, index) => {
    if(value[DB_DATA.id] === '') {
      const uuid = Utilities.getUuid()
      value[DB_DATA.id] = uuid
      sheet.getRange(`B${index+3}`).setValue(uuid)
    }
    sendHttpPost(value, stage)
  })
}

function convertCronTime(time, week) {
  const times = String(time).split(",")
  let date = new Date(times[0])
  let wait_candidates = ''
  if(times.length > 1){
    date = new Date(`${new Date().toLocaleDateString()} ${String(times[0]).split("~")[0]}`)
    times.forEach(time_candidates => {
      if(time_candidates.includes('~')) {
        time_candidates.split('~').forEach(time_candidate => {
          const wait_date = new Date(`${new Date().toLocaleDateString()} ${String(time_candidate)}`)
          wait_candidates += `${wait_date.getHours().toString().padStart(2, '0')}:${wait_date.getMinutes().toString().padStart(2, '0')}~`
        })
        wait_candidates = wait_candidates.replace(/(.*)\~/, "$1,")
      } else {
          const wait_date = new Date(`${new Date().toLocaleDateString()} ${String(time_candidates)}`)
          wait_candidates += `${wait_date.getHours().toString().padStart(2, '0')}:${wait_date.getMinutes().toString().padStart(2, '0')},`
      }
    })
    wait_candidates.slice(0, -1);
  }
  date.setHours(date.getHours() - 9)
  return {
    schedule_cron: `cron(${date.getMinutes()} ${date.getHours()} ? * ${week} *)`,
    wait_candidates: wait_candidates
  }
}

function sendHttpPost(value, stage){
   const apiPath = stage == 'prd' ? ApiPath_prd : ApiPath_dev
   const { schedule_cron, wait_candidates } = convertCronTime(value[DB_DATA.time], value[DB_DATA.week])
   const payload =
   {
     "id": value[DB_DATA.id],
     "tweet_type": value[DB_DATA.tweetType],
     "contents": value[DB_DATA.content],
     "schedule_cron": schedule_cron,
     "wait_candidates": wait_candidates,
     "delete_timestamp": new Date(value[DB_DATA.deleteSchedule]).toISOString(),
     "state": value[DB_DATA.state]
   }
    console.log('schedule:', schedule_cron)
   const options =
   {
     "method" : "post",
     "payload" : payload
   }
   UrlFetchApp.fetch(`${apiPath}/schedules`, options);
}

