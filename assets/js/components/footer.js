// /js/footer.js

// Helper render teks dari object { PROVINSI: [{city_name}, ...], ... }
function toLines(dict) {
  if (!dict || Object.keys(dict).length === 0) return "Data tidak tersedia.";
  return Object.entries(dict)
    .map(([prov, list]) => {
      const names = (list || []).map((x) => x.city_name).join(" | ");
      return `<b>${escapeHtml(prov)}</b> : ${escapeHtml(names)}`;
    })
    .join("<br/>");
}

async function getFooterData() {
  try {
    const response = await fetch(
      "https://mybiznet.biznetform.com/coverage-footer",
      {
        method: "GET",
        headers: { Authorization: "ea795dc37d9daf0f003f462d6458df6e" }, // ⚠️ token akan terlihat publik
      }
    );

    // Baca JSON SEKALI saja
    const json = await response.json();
    // console.log(json); // untuk debug

    if (!response.ok) {
      // response.ok false → lempar error dengan status
      throw new Error(`Gagal memuat data footer (HTTP ${response.status})`);
    }

    // Validasi payload API
    if (String(json?.code) !== "200" || !json?.data) {
      throw new Error("Payload API tidak valid (code != 200 atau data kosong)");
    }

    return json.data; // <- KEMBALIKAN BAGIAN data SAJA: { networks:{id,en}, iptv:{id,en} }
  } catch (error) {
    // Biarkan error naik ke caller
    throw error;
  }
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}

// Template footer—bagian kiri (kota) akan diisi dinamis
function makeFooterHtml(leftHtml) {
  return `
  <div class="footer-content">
    <!-- Kiri -->
    <section class="footer-inner-content foot-left">
      <h3 class="foot-title">BIZZNET FIBER - DAFTAR KOTA</h3>
      <p class="foot-cities">${leftHtml}</p>
    </section>

    <!-- Tengah -->
    <section class="footer-inner-content foot-mid">
      <h3 class="foot-title">TAUTAN CEPAT</h3>
      <nav aria-label="Footer Navigation">
        <ul class="foot-links">
          <li><a href="#">Perusahaan</a></li>
          <li><a href="#">Internet</a></li>
          <li><a href="#">Biznet IPTV</a></li>
          <li><a href="#">Berita & Media</a></li>
          <li><a href="#">Dukungan</a></li>
          <li><a href="#">Biznet Store</a></li>
        </ul>
      </nav>
      <br/>
      <h3 class="foot-title">MEDIA SOSIAL</h3>
      <ul class="socials">
        <li><a class="soc" href="#" aria-label="Facebook"><i class="fa-brands fa-facebook-f fa-xl"></i></a></li>
        <li><a class="soc" href="#" aria-label="YouTube"><i class="fa-brands fa-youtube fa-xl"></i></a></li>
        <li><a class="soc" href="#" aria-label="Instagram"><i class="fa-brands fa-instagram fa-xl"></i></a></li>
      </ul>
    </section>

    <!-- Kanan -->
    <section class="footer-inner-content foot-right">
      <h3 class="foot-title">INFORMASI KONTAK</h3>
      <div class="information">
        <div class="information-inner">
          <div class="soc"><i class="fa-solid fa-headphones"></i></div>
          <p>Biznet – 1500-988<br>Biznet Home – 1500-933 (HOTLINE 24 Jam)</p>
        </div>
        <div class="information-inner">
          <div class="soc"><i class="fa-solid fa-envelope"></i></div>
          <p>sales@biznetnetworks.com<br>Hubungi sales kami</p>
        </div>
        <div class="information-inner">
          <div class="soc"><i class="fa-solid fa-map-pin"></i></div>
          <p>MidPlaza 2, 8th Floor, Jl. Jendral Sudirman Kav 10-11 Jakarta 10220 – Indonesia<br>P +62-21-57998888</p>
        </div>
        <div class="information-inner">
          <img style="width:50px;height:50px" class="mybiznet-logo" src="https://biznethome.net/custom-upload/logo/Logo%20MyBiznet.png" alt="MyBiznet"/>
          <div style="display:flex;flex-direction:column">
            <p style="font-size:18px;font-weight:600;">My Biznet</p>
            <div style="display:flex;gap:10px;margin-top:5px;">
              <img style="width:95px;height:30px" src="https://biznethome.net/custom-upload/logo/Yfc020c87j0.png" alt="AppStore"/>
              <img style="width:95px;height:30px" src="https://biznethome.net/custom-upload/logo/c5Rp7Ym-Klz.png" alt="PlayStore"/>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
  <div class="footer-bottom">
    <p>© 2000 - 2025 All Rights Reserved. Kebijakan Privasi | Syarat dan Ketentuan 
      Biznet is part of MidPlaza Holding.</p>
  </div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const footerEl = document.getElementById("footer");
  footerEl.innerHTML = makeFooterHtml(
    '<span style="color:#6b7280">Memuat daftar kota…</span>'
  );

  try {
    const data = await getFooterData(); // <- sekarang data = { networks:{id,en}, iptv:{id,en} }

    const isEN =
      (document.documentElement.lang || "").toLowerCase().startsWith("en") ||
      location.pathname.slice(1, 3) === "en";

    const networks = isEN ? data?.networks?.en : data?.networks?.id; // ← sudah benar (pakai .data di getFooterData)

    const citiesHtml = toLines(networks);
    footerEl.innerHTML = makeFooterHtml(citiesHtml);
  } catch (err) {
    console.error(err);
    footerEl.innerHTML = makeFooterHtml(
      '<span style="color:#ef4444">Gagal memuat data kota.</span>'
    );
  }
});
