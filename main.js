const StorageKey = "jijan-data";
const LongGap = 90; // menit. jeda di atas ini dianggap jeda panjang

let selectedCategory = "food";
let chart = null;
let toastTimer;

// ambil data dari localStorage, kalau belum ada mulai dari kosong
let data = JSON.parse(localStorage.getItem(StorageKey));
if (data == null) {
  data = newData();
}

let currentDay = getToday();

// functions
function newData() {
  let pockets = {};
  for (let i = 0; i < Days.length; i++) {
    pockets[Days[i]] = 0;
  }

  return {
    schedule: [],
    pockets: pockets,
    expenses: [],
    reflections: {}
  };
}

function save() {
  localStorage.setItem(StorageKey, JSON.stringify(data));
}

function rupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

// ex: "13:30" -> 810
function toMinutes(jam) {
  let parts = jam.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ex: 140 -> "2j 20m"
function durasi(menit) {
  let jam = Math.floor(menit / 60);
  let sisa = menit % 60;

  if (jam == 0) return sisa + "m";
  if (sisa == 0) return jam + "j";
  return jam + "j " + sisa + "m";
}

function dua(n) {
  if (n < 10) return "0" + n;
  return "" + n;
}

function formatTanggal(d) {
  return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate());
}

function jamSekarang() {
  let now = new Date();
  return dua(now.getHours()) + ":" + dua(now.getMinutes());
}

// getDay() mulai dari minggu (0), padahal Days mulai dari senin
function dayIndex(d) {
  let i = d.getDay() - 1;
  if (i < 0) i = 6;
  return i;
}

function getToday() {
  return Days[dayIndex(new Date())];
}

// tanggal dari hari yg dipilih di minggu ini
function dateOf(day) {
  let d = new Date();
  let selisih = Days.indexOf(day) - dayIndex(d);
  d.setDate(d.getDate() + selisih);
  return formatTanggal(d);
}

// biar ga bisa masukin html aneh2 lewat input
function bersihin(teks) {
  return teks.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function showToast(pesan) {
  let toast = document.getElementById("toast");
  toast.innerText = pesan;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.add("hidden");
  }, 2500);
}


// grab data
function getClasses(day) {
  let hasil = [];
  for (let i = 0; i < data.schedule.length; i++) {
    if (data.schedule[i].day == day) {
      hasil.push(data.schedule[i]);
    }
  }
  // urutin dari jam paling pagi
  hasil.sort(function (a, b) {
    return toMinutes(a.start) - toMinutes(b.start);
  });
  return hasil;
}

function getExpenses(day) {
  let tgl = dateOf(day);
  let hasil = [];
  for (let i = 0; i < data.expenses.length; i++) {
    if (data.expenses[i].date == tgl) {
      hasil.push(data.expenses[i]);
    }
  }
  return hasil;
}

function getTotal(day) {
  let list = getExpenses(day);
  let total = 0;
  for (let i = 0; i < list.length; i++) {
    total += list[i].amount;
  }
  return total;
}

function refresh() {
  showSchedule();
  showBudget();
  showHistory();
  save();
}

function showSchedule() {
  let timeline = document.getElementById("timeline");
  let banner = document.getElementById("gap-banner");
  let classes = getClasses(currentDay);

  banner.classList.add("hidden");

  if (classes.length == 0) {
    timeline.innerHTML = '<div class="empty">Belum ada kelas di hari ' + currentDay + '. Klik "+ Kelas" buat nambahin.</div>';
    return;
  }

  let sisaBudget = data.pockets[currentDay] - getTotal(currentDay);
  let nowMin = toMinutes(jamSekarang());
  let html = "";
  let adaBanner = false;

  for (let i = 0; i < classes.length; i++) {
    let c = classes[i];

    // cek kelasnya lagi berlangsung atau ngga
    let lagiKelas = currentDay == getToday() && nowMin >= toMinutes(c.start) && nowMin <= toMinutes(c.end);

    html += '<div class="class-item ' + (lagiKelas ? "now" : "") + '">';
    html += '<span class="time-chip"><b>' + c.start + '</b>' + c.end + '</span>';
    html += '<div>';
    html += '<h2>' + bersihin(c.subject) + (lagiKelas ? '<span class="now-tag">sekarang</span>' : '') + '</h2>';
    html += '<div class="room">' + (c.room ? bersihin(c.room) : "-") + '</div>';
    html += '</div>';
    html += '<button class="del" title="Hapus" onclick="hapusKelas(' + c.id + ')">×</button>';
    html += '</div>';

    // jeda ke kelas berikutnya
    if (i < classes.length - 1) {
      let next = classes[i + 1];
      let jeda = toMinutes(next.start) - toMinutes(c.end);

      if (jeda >= LongGap) {
        html += gapCard(c.end, next.start, jeda, sisaBudget);

        // banner cuma buat jeda panjang yg pertama
        if (!adaBanner) {
          banner.innerHTML = currentDay + ' ada kosong <b>' + durasi(jeda) + '</b> (' + c.end + '-' + next.start + '). Biasanya di sini duit bocor, jadi di jadwal udah ada beberapa tempat murah.';
          banner.classList.remove("hidden");
          adaBanner = true;
        }
      } else if (jeda > 0) {
        html += '<div class="gap-item short">jeda ' + durasi(jeda) + '</div>';
      }
    }
  }

  timeline.innerHTML = html;
}

function gapCard(dari, sampai, jeda, sisaBudget) {
  let html = '<div class="gap-item long">';
  html += '<div class="gap-head">Kosong ' + durasi(jeda) + ', ' + dari + '-' + sampai + '</div>';
  html += '<div class="gap-sub">Sisa jatah ' + rupiah(Math.max(sisaBudget, 0)) + '. Daripada muter-muter, coba ini:</div>';
  html += '<div class="spots">';

  html += '<div><h6>Tempat nugas</h6>';
  for (let i = 0; i < CampusSpots.study.length; i++) {
    let s = CampusSpots.study[i];
    let tag = s.free ? '<span class="tag">gratis</span>' : '<span class="tag low">murah</span>';
    html += '<div class="spot"><b>' + s.name + ' ' + tag + '</b>' + s.note + ', ' + s.walk + ' mnt jalan</div>';
  }
  html += '</div>';

  // makanan udah urut dari yg paling murah, ambil 4 aja
  html += '<div><h6>Makan murah</h6>';
  for (let i = 0; i < 4; i++) {
    let f = CampusSpots.food[i];
    let kemahalan = f.price > sisaBudget; // dicoret kalau duitnya ga cukup
    html += '<div class="spot"><b>' + f.name + ' <span class="tag num ' + (kemahalan ? "over" : "") + '">' + (f.price / 1000) + 'rb</span></b>' + f.note + ', ' + f.walk + ' mnt jalan</div>';
  }
  html += '</div>';

  html += '</div></div>';
  return html;
}

function showBudget() {
  let jatah = data.pockets[currentDay];
  let sisa = jatah - getTotal(currentDay);

  document.getElementById("budget-day").innerText = currentDay.toLowerCase();
  document.getElementById("limit").innerText = "/ " + jatah.toLocaleString("id-ID");

  let teksSisa = document.getElementById("remaining");
  if (sisa < 0) {
    teksSisa.innerText = "- " + rupiah(-sisa);
    teksSisa.classList.add("neg");
  } else {
    teksSisa.innerText = rupiah(sisa);
    teksSisa.classList.remove("neg");
  }

  // progress bar
  let persen = 0;
  if (jatah > 0) {
    persen = (sisa / jatah) * 100;
    if (persen < 0) persen = 0;
    if (persen > 100) persen = 100;
  }

  let bar = document.getElementById("progress-bar");
  bar.style.width = persen + "%";
  if (persen > 50) {
    bar.style.background = "#2f6b3a";
  } else if (persen > 20) {
    bar.style.background = "#d9a21b";
  } else {
    bar.style.background = "#b23a2a";
  }

  let jumlahKelas = getClasses(currentDay).length;
  let label = "di rumah";
  if (jatah == 0) {
    label = "jatah belum diatur";
  } else if (jumlahKelas >= 3) {
    label = jumlahKelas + " kelas, hari padat";
  } else if (jumlahKelas > 0) {
    label = jumlahKelas + " kelas";
  }
  document.getElementById("day-type").innerText = label;
}

function showHistory() {
  let box = document.getElementById("history");
  let list = getExpenses(currentDay);

  if (list.length == 0) {
    box.innerHTML = '<div class="empty">Belum ada pengeluaran.</div>';
    return;
  }

  // yg terbaru di atas
  list.sort(function (a, b) {
    return toMinutes(b.time) - toMinutes(a.time);
  });

  let html = "";
  for (let i = 0; i < list.length; i++) {
    let e = list[i];
    let cat = Categories[e.category];
    let judul = e.note ? bersihin(e.note) : cat.label;

    html += '<div class="tx">';
    html += '<div class="tx-icon" style="background:' + cat.color + '"></div>';
    html += '<div class="tx-body"><b>' + judul + '</b><small>' + cat.label + ', ' + e.time + ', ' + e.method.toLowerCase() + '</small></div>';
    html += '<div class="tx-amt">−' + e.amount.toLocaleString("id-ID") + '</div>';
    html += '<button class="del" title="Hapus" onclick="hapusPengeluaran(' + e.id + ')">×</button>';
    html += '</div>';
  }
  box.innerHTML = html;
}

function hapusKelas(id) {
  data.schedule = data.schedule.filter(function (c) {
    return c.id != id;
  });
  refresh();
}

function hapusPengeluaran(id) {
  data.expenses = data.expenses.filter(function (e) {
    return e.id != id;
  });
  refresh();
}

function bukaModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function tutupModal(id) {
  document.getElementById(id).classList.add("hidden");
}

let semuaModal = document.querySelectorAll(".modal");
for (let i = 0; i < semuaModal.length; i++) {
  semuaModal[i].addEventListener("click", function (e) {
    // klik di luar kotak atau tombol batal -> tutup
    if (e.target == semuaModal[i] || e.target.hasAttribute("data-close")) {
      semuaModal[i].classList.add("hidden");
    }
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key == "Escape") {
    for (let i = 0; i < semuaModal.length; i++) {
      semuaModal[i].classList.add("hidden");
    }
  }
});


// days handler
let dayTabs = document.getElementById("day-tabs");
let classDay = document.getElementById("class-day");

for (let i = 0; i < Days.length; i++) {
  dayTabs.innerHTML += '<button data-day="' + Days[i] + '">' + Days[i] + '</button>';
  classDay.innerHTML += "<option>" + Days[i] + "</option>";
}

function pilihHari(day) {
  currentDay = day;

  // tandain tombol yg lagi dipilih + hari ini
  let tombol = dayTabs.querySelectorAll("button");
  for (let i = 0; i < tombol.length; i++) {
    tombol[i].classList.toggle("active", tombol[i].dataset.day == day);
    tombol[i].classList.toggle("today", tombol[i].dataset.day == getToday());
  }

  refresh();
}

dayTabs.onclick = function (e) {
  if (e.target.dataset.day) {
    pilihHari(e.target.dataset.day);
  }
};


// class handler
document.getElementById("btn-add-class").onclick = function () {
  document.getElementById("form-class").reset();
  classDay.value = currentDay;
  bukaModal("modal-class");
};

document.getElementById("form-class").onsubmit = function (e) {
  e.preventDefault();
  let form = e.target;

  if (toMinutes(form.end.value) <= toMinutes(form.start.value)) {
    showToast("Jam selesai harus setelah jam mulai");
    return;
  }

  data.schedule.push({
    id: Date.now(),
    day: form.day.value,
    start: form.start.value,
    end: form.end.value,
    subject: form.subject.value,
    room: form.room.value
  });

  tutupModal("modal-class");

  // pindah ke hari kelas yg baru ditambah
  pilihHari(form.day.value);
  showToast("Kelas disimpan");
};


// notes in wallet section
let catGrid = document.getElementById("cat-grid");
for (let key in Categories) {
  catGrid.innerHTML += '<button type="button" class="cat-btn" data-cat="' + key + '"><i style="background:' + Categories[key].color + '"></i>' + Categories[key].label + '</button>';
}

function pilihKategori(key) {
  selectedCategory = key;
  let tombol = document.querySelectorAll(".cat-btn");
  for (let i = 0; i < tombol.length; i++) {
    if (tombol[i].dataset.cat == key) {
      tombol[i].classList.add("active");
    } else {
      tombol[i].classList.remove("active");
    }
  }
}

catGrid.onclick = function (e) {
  let btn = e.target.closest(".cat-btn");
  if (btn) pilihKategori(btn.dataset.cat);
};

// tombol 5.000, 10.000 dst
let quickBtns = document.querySelectorAll("[data-amt]");
for (let i = 0; i < quickBtns.length; i++) {
  quickBtns[i].onclick = function () {
    document.getElementById("form-expense").amount.value = quickBtns[i].dataset.amt;
  };
}

function bukaFormPengeluaran() {
  document.getElementById("form-expense").reset();
  pilihKategori("food");
  bukaModal("modal-expense");
}

document.getElementById("btn-add-expense").onclick = bukaFormPengeluaran;

document.getElementById("form-expense").onsubmit = function (e) {
  e.preventDefault();
  let form = e.target;

  data.expenses.push({
    id: Date.now(),
    date: dateOf(currentDay),
    time: jamSekarang(),
    category: selectedCategory,
    amount: parseInt(form.amount.value),
    note: form.note.value,
    method: form.method.value
  });

  tutupModal("modal-expense");
  refresh();

  let sisa = data.pockets[currentDay] - getTotal(currentDay);
  if (sisa >= 0) {
    showToast("Dicatat. Sisa " + rupiah(sisa));
  } else {
    showToast("Lewat jatah " + rupiah(-sisa));
  }
};


// Configure money thing I hope it works
document.getElementById("btn-pockets").onclick = function () {
  let html = "";
  for (let i = 0; i < Days.length; i++) {
    let day = Days[i];
    let jumlah = getClasses(day).length;
    let info = jumlah > 0 ? jumlah + " kelas" : "di rumah";

    html += '<div class="pocket-row">';
    html += '<span>' + day + '</span>';
    html += '<small>' + info + '</small>';
    html += '<input type="number" name="' + day + '" min="0" step="1000" value="' + data.pockets[day] + '">';
    html += '</div>';
  }
  document.getElementById("pocket-fields").innerHTML = html;
  bukaModal("modal-pockets");
};

document.getElementById("form-pockets").onsubmit = function (e) {
  e.preventDefault();
  for (let i = 0; i < Days.length; i++) {
    let isi = parseInt(e.target[Days[i]].value);
    data.pockets[Days[i]] = isNaN(isi) ? 0 : isi;
  }
  tutupModal("modal-pockets");
  refresh();
  showToast("Jatah disimpan");
};


// reflection
function hitungStreak() {
  let streak = 0;
  let d = new Date();

  for (let i = 0; i < 60; i++) {
    let r = data.reflections[formatTanggal(d)];
    if (r && r.ok) {
      streak++;
    } else if (i > 0) {
      break; // hari ini belum dicek gpp, tapi kemarin kosong berarti putus
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function showReflection() {
  let jatah = data.pockets[currentDay];
  let keluar = getTotal(currentDay);
  let aman = keluar <= jatah;

  data.reflections[dateOf(currentDay)] = { spent: keluar, limit: jatah, ok: aman };
  save();

  // rincian per kategori
  let rincian = [];
  let list = getExpenses(currentDay);
  for (let key in Categories) {
    let jumlah = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].category == key) jumlah += list[i].amount;
    }
    if (jumlah > 0) {
      rincian.push(Categories[key].label.toLowerCase() + " " + rupiah(jumlah));
    }
  }

  let judul;
  if (aman) {
    judul = 'Aman. <span>Sisa ' + rupiah(jatah - keluar) + '</span>';
  } else {
    judul = 'Kebablasan <span>' + rupiah(keluar - jatah) + '</span>';
  }

  let html = '<div class="score ' + (aman ? "win" : "lose") + '">';
  html += '<div class="verdict">' + judul + '</div>';
  html += '<small>' + rupiah(keluar) + ' dari jatah ' + rupiah(jatah);
  if (rincian.length > 0) html += ' (' + rincian.join(", ") + ')';
  html += '</small></div>';
  html += '<p class="streak">' + hitungStreak() + ' hari berturut-turut di bawah jatah.</p>';
  html += '<p class="muted">Ada bayar cash yang belum masuk? Catat sekarang mumpung masih ingat.</p>';

  document.getElementById("reflect-result").innerHTML = html;
  gambarChart();
}

function gambarChart() {
  let labels = [];
  let keluar = [];
  let jatah = [];
  let warna = [];

  for (let i = 0; i < Days.length; i++) {
    labels.push(Days[i].substring(0, 3));
    keluar.push(getTotal(Days[i]));
    jatah.push(data.pockets[Days[i]]);
    warna.push(keluar[i] > jatah[i] ? "#b23a2a" : "#2f6b3a");
  }

  // hapus chart lama dulu biar ga numpuk
  if (chart != null) chart.destroy();

  chart = new Chart(document.getElementById("week-chart"), {
    data: {
      labels: labels,
      datasets: [
        { type: "bar", label: "keluar", data: keluar, backgroundColor: warna },
        { type: "line", label: "jatah", data: jatah, borderColor: "#1f1d1a", borderDash: [5, 4], pointRadius: 0 }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value / 1000 + "k";
            }
          }
        }
      }
    }
  });
}

document.getElementById("btn-reflect").onclick = function () {
  bukaModal("modal-reflect");
  showReflection();
};

document.getElementById("btn-reflect-log").onclick = function () {
  tutupModal("modal-reflect");
  bukaFormPengeluaran();
};

// jam 8 malam ke atas, munculin refleksi sekali sehari
// (cuma kalau udah ada jadwal / jatah, biar ga muncul pas baru pertama buka)
let udahDiisi = data.schedule.length > 0 || data.expenses.length > 0;
if (new Date().getHours() >= 20 && udahDiisi && !data.reflections[formatTanggal(new Date())]) {
  setTimeout(function () {
    pilihHari(getToday());
    bukaModal("modal-reflect");
    showReflection();
    showToast("Udah malam, cek pengeluaran hari ini");
  }, 800);
}


// tombol hapus semua
document.getElementById("btn-reset").onclick = function () {
  if (confirm("Yakin mau hapus semua jadwal & pengeluaran?")) {
    data = newData();
    refresh();
    showToast("Semua data dihapus");
  }
};


pilihHari(currentDay);
