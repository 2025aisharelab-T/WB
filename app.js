// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 04 단원 : data/tasks.json 에서 일정 목록을 읽어옴
let baseTasks = [];
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

async function loadTasks() {
  const msgBox = document.getElementById('msgBox');
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    baseTasks = await res.json();
    if (msgBox && msgBox.textContent === '배포 주소로 열어 주세요') {
      msgBox.textContent = '';
    }
  } catch (err) {
    console.warn('tasks.json 읽기 실패 (로컬 파일 또는 네트워크):', err);
    baseTasks = [];
    if (msgBox) {
      msgBox.textContent = '배포 주소로 열어 주세요';
    }
  }

  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  tasks = baseTasks.concat(saved);
  renderTasks();
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  if (tasks.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.style.textAlign = 'center';
    td.style.color = '#c62828';
    td.textContent = '배포 주소로 열어 주세요';
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  await loadTasks();
}

function renderTodayDate() {
  const el = document.getElementById('currentDate');
  if (el) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    el.textContent = `${yyyy}-${mm}-${dd}`;
  }
}

const isTestWind = new URLSearchParams(window.location.search).get('test') === 'wind';

async function loadWeather() {
  const weatherBox = document.getElementById('weatherBox');
  if (weatherBox) {
    weatherBox.textContent = '날씨 정보를 불러오는 중...';
  }

  const regionNames = Object.keys(COORDINATES);
  try {
    const requests = regionNames.map(async (name) => {
      const coords = COORDINATES[name];
      const url = buildWeatherUrl(coords.lat, coords.lon);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = parseWeatherData(data, isTestWind);
      if (parsed) {
        weatherByRegion[name] = parsed;
      }
    });

    await Promise.all(requests);

    if (weatherBox) {
      weatherBox.textContent = isTestWind
        ? '오늘 날씨 정보가 업데이트되었습니다. (시험 모드: 풍속 12m/s 적용)'
        : '오늘 지역별 날씨 정보가 업데이트되었습니다.';
    }
  } catch (err) {
    console.warn('날씨 정보를 불러오는 중 오류 발생:', err);
    if (weatherBox) {
      weatherBox.textContent = '날씨 정보를 불러오지 못했습니다. (오프라인/대기 모드)';
    }
  } finally {
    renderTasks();
  }
}

document.getElementById('taskForm').addEventListener('submit', addTask);
renderTodayDate();
loadTasks();
loadWeather();
