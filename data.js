// data tetap buat JiJan (bukan data user)

const Days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// tempat2 di sekitar kampus buat rekomendasi pas jeda panjang
// walk = berapa menit jalan kaki
const CampusSpots = {
  study: [
    { name: "Perpustakaan Pusat", free: true, note: "lantai 3 sepi, ada colokan", walk: 5 },
    { name: "Selasar GK", free: true, note: "meja panjang, buka 07-21", walk: 2 },
    { name: "Lounge FIK", free: true, note: "sofa + AC, tunjuk KTM", walk: 3 },
    { name: "Kopi Pojok", free: false, note: "beli satu es kopi, bebas duduk", walk: 6 }
  ],
  food: [
    { name: "Kantin Pusat", price: 10000, note: "mie ayam / bakso", walk: 5 },
    { name: "Kantin Teknik", price: 12000, note: "nasi + lauk + es teh", walk: 3 },
    { name: "Warteg Bahari", price: 13000, note: "nasi, sayur, telur", walk: 7 },
    { name: "Rocket Chicken", price: 15000, note: "paket nasi ayam", walk: 10 },
    { name: "Olive Fried Chicken", price: 16000, note: "paket hemat", walk: 9 }
  ]
};

const Categories = {
  food: { label: "Makan", color: "#d9822b" },
  transit: { label: "Transport", color: "#3f7cac" },
  academic: { label: "Kuliah", color: "#7a5ca8" },
  leisure: { label: "Nongkrong", color: "#c2577a" }
};
