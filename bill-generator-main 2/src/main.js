import html2canvas from "html2canvas";
import JSZip from "jszip";

      const $ = (s) => document.querySelector(s);
      const pad = (n) => String(n).padStart(2, "0");
      const esc = (s) =>
        String(s ?? "").replace(
          /[&<>"]/g,
          (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
        );
      const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
      const val = (k) => document.querySelector(`[data-k=${k}]`).value;
      const SHARED = ["copy", "name", "addr", "cashier", "cgst", "sgst", "round", "footer"];
      const shared = () => Object.fromEntries(SHARED.map((k) => [k, val(k)]));
      const isoDate = (d) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      let tab = "single";
      let items = [{ name: "Combo2", sub: "", qty: 1, price: 250 }];
      let bills = [];
      let cur = -1;
      let nextId = 1;
      let bgFrac = Math.random();

      const now = new Date();
      $("[data-k=date]").value = isoDate(now);
      $("[data-k=time]").value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

      /* ---------- Menu ---------- */
      const DEFAULT_MENU = [
        { name: "Combo2", price: 250 },
        { name: "Brownie With Ice Cream", price: 145 },
        { name: "Sliced Cheese", price: 20 },
        { name: "Packing 10", price: 10 },
        { name: "Chicken 65 Biryani", price: 214 },
        { name: "Tawa Roasted Chicken Biryani", price: 203 },
        { name: "Me Fried Chicken", price: 180 },
        { name: "Classic Chicken Burger", price: 130 },
        { name: "Chicken Lollipop 4 Pcs", price: 160 },
        { name: "Classic Chicken Bucket 4 Pcs", price: 440 },
        { name: "Chicken Popcorn 100 Gms", price: 145 },
        { name: "Chicken Fries (10 Pcs)", price: 130 },
        { name: "Glazed Chicken 2 Pcs", price: 240 },
        { name: "Classic Chicken 2 Pcs", price: 220 },
        { name: "Hot Wings (8 Pcs)", price: 310 },
        { name: "Tandoori Chicken Tikka (5 Pcs)", price: 220 },
        { name: "Soft Drinks Pet 200 Ml", price: 20 },
      ];
      let menu;
      try {
        menu = JSON.parse(localStorage.getItem("billMenuMeSmoke")) || DEFAULT_MENU;
      } catch {
        menu = DEFAULT_MENU;
      }
      const saveMenu = () => {
        try {
          localStorage.setItem("billMenuMeSmoke", JSON.stringify(menu));
        } catch {}
      };

      /* ---------- Receipt rendering ---------- */
      function calc(list, cg, sg, round) {
        const sub = list.reduce(
          (s, it) => s + (+it.qty || 0) * (+it.price || 0),
          0,
        );
        const cgAmt = Math.round(sub * cg) / 100,
          sgAmt = Math.round(sub * sg) / 100;
        const raw = Math.round((sub + cgAmt + sgAmt) * 100) / 100;
        const grand = round === "nearest" ? Math.round(raw) : raw;
        const ro = Math.round((grand - raw) * 100) / 100;
        return { sub, cgAmt, sgAmt, raw, grand, ro };
      }
      const taxOf = (list) => {
        const s = shared();
        return calc(list, +s.cgst || 0, +s.sgst || 0, s.round);
      };

      function receiptHTML(val, items) {
        const d = val("date").split("-");
        const dateStr =
          d.length === 3 ? `${d[2]}/${d[1]}/${d[0].slice(2)}` : "";
        const qty = items.reduce((s, it) => s + (+it.qty || 0), 0);
        const cg = +val("cgst") || 0,
          sg = +val("sgst") || 0;
        const { sub, cgAmt, sgAmt, grand, ro } = calc(items, cg, sg, val("round"));

        const rows = items
          .map(
            (it) => `
    <tr>
      <td>${esc(it.name)}${it.sub ? "<br>" + esc(it.sub) : ""}</td>
      <td class="q">${esc(it.qty)}</td>
      <td class="p">${money(+it.price || 0)}</td>
      <td class="a">${money((+it.qty || 0) * (+it.price || 0))}</td>
    </tr>`,
          )
          .join("");

        return `
    <div class="c r-copy">${esc(val("copy"))}</div>
    <div class="c r-name">${esc(val("name"))}</div>
    <div class="c r-addr">${esc(val("addr"))}</div>
    <div class="dbl"></div>
    <div class="meta">
      <div>Date: ${dateStr}</div><div class="right"><b>${esc(val("otype"))}${val("table") ? ": " + esc(val("table")) : ""}</b></div>
      <div>${esc(val("time"))}</div><div></div>
      <div>Cashier: ${esc(val("cashier"))}</div><div class="right">Bill No.: ${esc(val("billno"))}</div>
    </div>
    <div class="sgl"></div>
    <table class="items">
      <thead><tr><th>Item</th><th class="q">Qty.</th><th class="p">Price</th><th class="a">Amount</th></tr></thead>
    </table>
    <div class="sgl" style="margin-top:2px"></div>
    <table class="items"><colgroup><col><col style="width:9%"><col style="width:18%"><col style="width:18%"></colgroup><tbody>${rows}</tbody></table>
    <div class="sgl"></div>
    <div class="totals">
      <div class="l tq">Total Qty: ${qty} <span class="st">Sub<br>Total</span></div><div class="v num">${money(sub)}</div>
      ${cg ? `<div class="l">CGST ${cg}% ${cg}%</div><div class="v num">${money(cgAmt)}</div>` : ""}
      ${sg ? `<div class="l">SGST ${sg}% ${sg}%</div><div class="v num">${money(sgAmt)}</div>` : ""}
    </div>
    <div class="sgl" style="margin-top:6px"></div>
    <div class="totals">
      ${ro !== 0 ? `<div class="l ro">Round off</div><div class="v num ro">${ro > 0 ? "+" : ""}${money(ro)}</div>` : ""}
    </div>
    <div class="grand"><span>Grand Total</span><span>₹${money(grand)}</span></div>
    <div class="sgl" style="margin-top:5px"></div>
    <div class="thanks">${esc(val("footer"))}</div>`;
      }

      // The tile repeats vertically; shifting its start offset changes where
      // the pattern begins and ends on the paper.
      function applyBg(el, on, frac) {
        el.style.backgroundImage = on ? "" : "none";
        el.style.backgroundPosition = `0 ${Math.round(frac * el.offsetWidth)}px`;
      }

      const billVal = (b) => {
        const sh = shared();
        return (k) => (k in b ? b[k] : sh[k]);
      };

      function renderPreview() {
        const el = $("#receipt");
        const bgOn = $("#bgToggle").checked;
        if (tab === "single") {
          el.style.display = "";
          $("#emptyHint").style.display = "none";
          el.innerHTML = receiptHTML(val, items);
          applyBg(el, bgOn, bgFrac);
        } else if (bills[cur]) {
          el.style.display = "";
          $("#emptyHint").style.display = "none";
          el.innerHTML = receiptHTML(billVal(bills[cur]), bills[cur].items);
          applyBg(el, bgOn, bills[cur].bg);
        } else {
          el.style.display = "none";
          $("#emptyHint").style.display = "flex";
        }
      }

      /* ---------- Tabs ---------- */
      function setTab(t) {
        tab = t;
        document.body.dataset.tab = t;
        document
          .querySelectorAll(".tabs button")
          .forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
        if (t === "bulk") {
          renderBillList();
          renderBillEditor();
        }
        renderPreview();
      }
      document
        .querySelectorAll(".tabs button")
        .forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));

      /* ---------- Single bill ---------- */
      function renderItemsEditor() {
        $("#items").innerHTML = items
          .map(
            (it, i) => `
    <div class="item">
      <button type="button" class="del" data-del="${i}" title="Remove">×</button>
      <label>Item name</label><input data-i="${i}" data-f="name" value="${esc(it.name)}">
      <div class="row">
        <div><label>Tag (optional)</label><input data-i="${i}" data-f="sub" value="${esc(it.sub)}"></div>
        <div><label>Qty</label><input type="number" min="0" step="1" data-i="${i}" data-f="qty" value="${it.qty}"></div>
        <div><label>Price</label><input type="number" min="0" step="0.01" data-i="${i}" data-f="price" value="${it.price}"></div>
      </div>
    </div>`,
          )
          .join("");
      }
      $("#addItem").onclick = () => {
        items.push({ name: "New Item", sub: "", qty: 1, price: 0 });
        renderItemsEditor();
        renderPreview();
      };

      function renderMenu() {
        const q = ($("#menuSearch").value || "").toLowerCase();
        $("#menuList").innerHTML =
          menu
            .map((m, i) => ({ m, i }))
            .filter(({ m }) => m.name.toLowerCase().includes(q))
            .map(
              ({
                m,
                i,
              }) => `<div class="menu-row"><span class="n">${esc(m.name)}</span><span class="pr">₹${money(m.price)}</span>
      <button type="button" class="mini ad" data-madd="${i}">Add</button><button type="button" class="mini rm" data-mrm="${i}">×</button></div>`,
            )
            .join("") ||
          '<div style="font-size:12px;color:#777">No items</div>';
      }
      $("#mSave").onclick = () => {
        const name = $("#mName").value.trim(),
          price = +$("#mPrice").value;
        if (!name) return;
        menu.push({ name, price: price || 0 });
        saveMenu();
        $("#mName").value = "";
        $("#mPrice").value = "";
        renderMenu();
      };

      /* ---------- Background controls ---------- */
      function syncBgControls() {
        const on = $("#bgToggle").checked;
        $("#bgRandom").disabled = $("#bgShuffle").disabled = !on;
      }
      $("#bgShuffle").onclick = () => {
        if (tab === "bulk" && bills[cur]) bills[cur].bg = Math.random();
        else bgFrac = Math.random();
        renderPreview();
      };

      /* ---------- Bulk: generation ---------- */
      function rng(seedStr) {
        let a = 0;
        const str = seedStr || String(Math.random());
        for (let i = 0; i < str.length; i++)
          a = (Math.imul(a, 31) + str.charCodeAt(i)) | 0;
        return () => {
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const toMin = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const ADDON = /^(packing|sliced cheese)/i;

      function readOptions() {
        const num = (id, d) => (isNaN(+$(id).value) || $(id).value === "" ? d : +$(id).value);
        const day = (id) => {
          const [y, m, d] = $(id).value.split("-").map(Number);
          return new Date(y, m - 1, d);
        };
        const minItems = Math.max(1, Math.floor(num("#bMinItems", 1)));
        return {
          from: day("#bFrom"),
          to: day("#bTo"),
          open: $("#bOpen").value,
          close: $("#bClose").value,
          count: Math.max(1, Math.floor(num("#bCount", 1))),
          budget: num("#bBudget", 0),
          fill: $("#bFill").value === "fill",
          minItems,
          maxItems: Math.max(minItems, Math.floor(num("#bMaxItems", 4))),
          maxQty: Math.max(1, Math.floor(num("#bMaxQty", 1))),
          dine: Math.min(100, Math.max(0, num("#bDine", 0))),
          tables: Math.max(1, Math.floor(num("#bTables", 10))),
          start: Math.floor(num("#bStart", 1)),
          pack: $("#bPack").checked,
          addon: $("#bAddon").checked,
        };
      }

      function makeBills(o, r) {
        const s = shared();
        const cg = +s.cgst || 0,
          sg = +s.sgst || 0;
        const grandOf = (list) => calc(list, cg, sg, s.round).grand;
        const addons = menu.filter((m) => ADDON.test(m.name));
        const mains = menu.filter((m) => !ADDON.test(m.name) && m.price > 0);
        if (!mains.length) throw new Error("Menu has no main items.");
        if (isNaN(o.from) || isNaN(o.to)) throw new Error("Pick both dates.");
        const cheapest = Math.min(...mains.map((m) => m.price));
        const minBill = grandOf([{ qty: 1, price: cheapest }]);
        if (o.budget < minBill * o.count)
          throw new Error(
            `Budget too low: ${o.count} bills need at least ₹${minBill * o.count}.`,
          );
        const days = Math.round((o.to - o.from) / 864e5) + 1;
        const openM = toMin(o.open),
          closeM = toMin(o.close);
        if (days < 1 || !(closeM > openM))
          throw new Error("Check the dates and opening hours.");

        const slots = Array.from({ length: o.count }, () => ({
          day: Math.floor(r() * days),
          mins: openM + Math.floor(r() * (closeM - openM)),
        })).sort((a, b) => a.day - b.day || a.mins - b.mins);

        const randomBg = $("#bgRandom").checked;
        const out = [];
        let spent = 0;
        slots.forEach((sl, i) => {
          const left = o.count - i - 1;
          const maxThis = o.budget - spent - left * minBill;
          const target = Math.min(
            o.fill
              ? ((o.budget - spent) / (left + 1)) * (left ? 0.85 + r() * 0.3 : 1)
              : (o.budget / o.count) * (0.6 + r() * 0.8),
            maxThis,
          );
          const dine = r() * 100 < o.dine;
          const list = [];
          const find = (m) => list.find((x) => x.name === m.name);
          const add = (m, q) => {
            const ex = find(m);
            if (ex) ex.qty += q;
            else list.push({ name: m.name, sub: "", qty: q, price: m.price });
          };
          const undo = (m, q) => {
            const ex = find(m);
            ex.qty -= q;
            if (ex.qty <= 0) list.splice(list.indexOf(ex), 1);
          };
          const ok = (m) => grandOf([{ qty: 1, price: m.price }]) <= maxThis;
          const pool = mains.filter(ok);
          const cand = (pool.length ? pool : [mains.find((m) => m.price === cheapest)])
            .map((m) => [r(), m])
            .sort((a, b) => a[0] - b[0])
            .map((x) => x[1]);
          const n = o.minItems + Math.floor(r() * (o.maxItems - o.minItems + 1));
          const cap = Math.min(target * 1.1, maxThis);

          // pick up to n distinct mains, then trim to the budget
          for (const m of cand.slice(0, n)) {
            const q = r() < 0.7 ? 1 : 1 + Math.floor(r() * o.maxQty);
            add(m, q);
            if (list.length > 1 && grandOf(list) > cap) undo(m, q);
          }
          // grow towards the target
          for (let k = 0; k < 24 && grandOf(list) < target * 0.88; k++) {
            const unused = cand.filter((m) => !find(m));
            let m, q = 1;
            if (list.length < o.maxItems && unused.length)
              m = unused[Math.floor(r() * unused.length)];
            else {
              const grow = list.filter((x) => x.qty < o.maxQty);
              if (!grow.length) break;
              m = grow[Math.floor(r() * grow.length)];
            }
            add(m, q);
            if (grandOf(list) > cap) undo(m, q);
          }
          // extras
          for (const m of addons) {
            const isPack = /^packing/i.test(m.name);
            if (isPack ? o.pack && !dine : o.addon && r() < 0.25) {
              const q = isPack ? 1 : 1 + Math.floor(r() * 2);
              add(m, q);
              if (grandOf(list) > maxThis) undo(m, q);
            }
          }
          spent += grandOf(list);
          const dt = new Date(o.from.getTime() + sl.day * 864e5);
          out.push({
            id: nextId++,
            date: isoDate(dt),
            time: `${pad(Math.floor(sl.mins / 60))}:${pad(sl.mins % 60)}`,
            otype: dine ? "Dine In" : "Pick Up",
            table: dine ? String(1 + Math.floor(r() * o.tables)) : "",
            billno: String(o.start + i),
            items: list,
            bg: randomBg ? r() : bgFrac,
            sel: true,
          });
        });
        return out;
      }

      $("#bGen").onclick = () => {
        const st = $("#bStatus");
        try {
          bills = makeBills(readOptions(), rng($("#bSeed").value.trim()));
        } catch (e) {
          st.textContent = e.message;
          return;
        }
        cur = 0;
        $("#bBar").style.width = "0";
        st.textContent = "Only ticked bills are exported.";
        renderBillList();
        renderBillEditor();
        renderPreview();
      };

      /* ---------- Bulk: list ---------- */
      function renderBillList() {
        const cap = +$("#bBudget").value || 0;
        let all = 0,
          selN = 0,
          selT = 0;
        const cards = bills.map((b, i) => {
          const t = taxOf(b.items).grand;
          all += t;
          if (b.sel) {
            selN++;
            selT += t;
          }
          const names = b.items.map((x) => `${x.name}${x.qty > 1 ? " ×" + x.qty : ""}`).join(", ");
          return `<div class="bill-card${i === cur ? " cur" : ""}" data-bpick="${i}">
            <input type="checkbox" data-bsel="${i}" ${b.sel ? "checked" : ""}>
            <div class="t"><b>#${esc(b.billno)} · ${esc(b.otype)}${b.table ? " " + esc(b.table) : ""}</b>
              <span>${esc(b.date.split("-").reverse().join("/"))} ${esc(b.time)} · ${esc(names)}</span></div>
            <div class="amt">₹${money(t)}</div></div>`;
        });
        $("#billList").innerHTML =
          cards.join("") || '<div class="empty">No bills yet. Set the options and press Generate.</div>';
        const over = cap && all > cap;
        $("#bSummary").innerHTML = bills.length
          ? `${bills.length} bills · total <b class="${over ? "over" : ""}">₹${money(all)}</b>${cap ? ` / cap ₹${money(cap)}` : ""}<br>Ticked: ${selN} · ₹${money(selT)}`
          : "No bills yet.";
        $("#bDownload").textContent = `Download zip (${selN})`;
        $("#bDownload").disabled = !selN;
      }

      /* ---------- Bulk: editor for the selected bill ---------- */
      function renderBillEditor() {
        const b = bills[cur];
        if (!b) {
          $("#billEditor").innerHTML = "";
          return;
        }
        $("#billEditor").innerHTML = `
    <fieldset style="margin:0">
      <legend>Edit bill #${esc(b.billno)}</legend>
      <div class="row">
        <div><label>Date</label><input type="date" data-bf="date" value="${esc(b.date)}"></div>
        <div><label>Time</label><input type="time" data-bf="time" value="${esc(b.time)}"></div>
      </div>
      <div class="row">
        <div><label>Order type</label><input data-bf="otype" list="otypes" value="${esc(b.otype)}"></div>
        <div><label>Table</label><input data-bf="table" value="${esc(b.table)}"></div>
        <div><label>Bill No.</label><input data-bf="billno" value="${esc(b.billno)}"></div>
      </div>
      <datalist id="otypes"><option>Dine In</option><option>Pick Up</option></datalist>
      ${b.items
        .map(
          (it, i) => `
      <div class="item">
        <button type="button" class="del" data-bdel="${i}" title="Remove">×</button>
        <label>Item name</label><input data-bi="${i}" data-bif="name" value="${esc(it.name)}">
        <div class="row">
          <div><label>Qty</label><input type="number" min="0" step="1" data-bi="${i}" data-bif="qty" value="${it.qty}"></div>
          <div><label>Price</label><input type="number" min="0" step="0.01" data-bi="${i}" data-bif="price" value="${it.price}"></div>
        </div>
      </div>`,
        )
        .join("")}
      <div class="row" style="margin-top:8px">
        <div style="flex:2"><select id="bMenuPick">${menu
          .map((m, i) => `<option value="${i}">${esc(m.name)} — ₹${money(m.price)}</option>`)
          .join("")}</select></div>
        <div style="flex:none"><button type="button" class="btn add sm" id="bAddMenu" style="margin:0">Add</button></div>
      </div>
      <button type="button" class="btn add sm" id="bAddCustom" style="margin-top:8px">+ Custom item</button>
      <div class="row" style="margin-top:12px;gap:6px">
        <button type="button" class="btn add sm" id="bDup" style="margin:0">Duplicate</button>
        <button type="button" class="btn danger sm" id="bDel" style="margin:0">Delete bill</button>
      </div>
    </fieldset>`;
      }
      const afterBillEdit = () => {
        renderBillList();
        renderPreview();
      };

      /* ---------- Bulk: export ---------- */
      async function exportZip() {
        const st = $("#bStatus"),
          bar = $("#bBar"),
          btn = $("#bDownload");
        const chosen = bills.filter((b) => b.sel);
        if (!chosen.length) return;
        const scale = +$("#bScale").value,
          fmt = $("#bFmt").value,
          ext = fmt === "jpeg" ? "jpg" : "png",
          bgOn = $("#bgToggle").checked,
          withLabels = $("#bLabels").checked;
        btn.disabled = true;
        bar.style.width = "0";
        const zip = new JSZip();
        const holder = document.createElement("div");
        holder.id = "offscreen";
        const node = document.createElement("div");
        node.className = "receipt";
        holder.appendChild(node);
        document.body.appendChild(holder);
        const sh = shared();
        const labels = [];
        const csv = [
          "file,date,time,order_type,table,bill_no,items,total_qty,sub_total,cgst,sgst,round_off,grand_total",
        ];
        const used = new Set();
        try {
          for (let i = 0; i < chosen.length; i++) {
            const b = chosen[i];
            node.innerHTML = receiptHTML(billVal(b), b.items);
            applyBg(node, bgOn, b.bg);
            const canvas = await html2canvas(node, { scale, backgroundColor: "#ffffff" });
            const blob = await new Promise((res) =>
              canvas.toBlob(res, `image/${fmt}`, 0.92),
            );
            if (!blob) throw new Error("Canvas export blocked by the browser.");
            let base = `bill_${String(b.billno).replace(/[^\w-]+/g, "_")}`,
              file = `${base}.${ext}`;
            for (let n = 2; used.has(file); n++) file = `${base}_${n}.${ext}`;
            used.add(file);
            zip.file(`images/${file}`, blob);
            const t = taxOf(b.items);
            const qty = b.items.reduce((s, x) => s + (+x.qty || 0), 0);
            labels.push({
              file,
              business: sh.name,
              address: sh.addr,
              date: b.date,
              time: b.time,
              order_type: b.otype,
              table: b.table,
              cashier: sh.cashier,
              bill_no: b.billno,
              bg_offset: bgOn ? +b.bg.toFixed(4) : null,
              items: b.items.map((x) => ({
                name: x.name,
                qty: +x.qty,
                price: +x.price,
                amount: x.qty * x.price,
              })),
              total_qty: qty,
              sub_total: t.sub,
              cgst: t.cgAmt,
              sgst: t.sgAmt,
              round_off: t.ro,
              grand_total: t.grand,
            });
            csv.push(
              [
                file, b.date, b.time, b.otype, b.table, b.billno,
                `"${b.items.map((x) => `${x.name} x${x.qty} @${x.price}`).join("; ")}"`,
                qty, money(t.sub), money(t.cgAmt), money(t.sgAmt), money(t.ro), money(t.grand),
              ].join(","),
            );
            bar.style.width = `${((i + 1) / chosen.length) * 100}%`;
            st.textContent = `Rendering ${i + 1} / ${chosen.length}…`;
          }
          if (withLabels) {
            zip.file("labels.json", JSON.stringify(labels, null, 2));
            zip.file("labels.csv", csv.join("\n"));
          }
          st.textContent = "Zipping…";
          const out = await zip.generateAsync({ type: "blob" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(out);
          a.download = `bills_${chosen[0].date}_to_${chosen[chosen.length - 1].date}.zip`;
          a.click();
          st.textContent = `Done: ${labels.length} bills, total ₹${money(labels.reduce((s, l) => s + l.grand_total, 0))}.`;
        } catch (e) {
          st.textContent = "Failed: " + e.message;
        } finally {
          holder.remove();
          btn.disabled = false;
        }
      }
      $("#bDownload").onclick = exportZip;

      /* ---------- Events ---------- */
      document.addEventListener("input", (e) => {
        const t = e.target;
        if (t.dataset.i !== undefined) items[+t.dataset.i][t.dataset.f] = t.value;
        else if (t.dataset.bf !== undefined && bills[cur]) {
          bills[cur][t.dataset.bf] = t.value;
          afterBillEdit();
          return;
        } else if (t.dataset.bi !== undefined && bills[cur]) {
          bills[cur].items[+t.dataset.bi][t.dataset.bif] = t.value;
          afterBillEdit();
          return;
        }
        renderPreview();
        if (tab === "bulk") renderBillList();
      });
      document.addEventListener("change", (e) => {
        const t = e.target;
        if (t.dataset.bsel !== undefined) {
          bills[+t.dataset.bsel].sel = t.checked;
          renderBillList();
          return;
        }
        syncBgControls();
        renderPreview();
        if (tab === "bulk") renderBillList();
      });
      document.addEventListener("click", (e) => {
        const t = e.target;
        const d = t.dataset;
        if (d.del !== undefined) {
          items.splice(+d.del, 1);
          renderItemsEditor();
          renderPreview();
        }
        if (d.madd !== undefined) {
          const m = menu[+d.madd],
            ex = items.find((it) => it.name === m.name && +it.price === +m.price);
          if (ex) ex.qty = (+ex.qty || 0) + 1;
          else items.push({ name: m.name, sub: "", qty: 1, price: m.price });
          renderItemsEditor();
          renderPreview();
        }
        if (d.mrm !== undefined) {
          menu.splice(+d.mrm, 1);
          saveMenu();
          renderMenu();
        }
        if (d.bdel !== undefined && bills[cur]) {
          bills[cur].items.splice(+d.bdel, 1);
          renderBillEditor();
          afterBillEdit();
        }
        if (t.id === "bAddMenu" && bills[cur]) {
          const m = menu[+$("#bMenuPick").value];
          if (m) {
            const ex = bills[cur].items.find((x) => x.name === m.name && +x.price === +m.price);
            if (ex) ex.qty = (+ex.qty || 0) + 1;
            else bills[cur].items.push({ name: m.name, sub: "", qty: 1, price: m.price });
            renderBillEditor();
            afterBillEdit();
          }
        }
        if (t.id === "bAddCustom" && bills[cur]) {
          bills[cur].items.push({ name: "New Item", sub: "", qty: 1, price: 0 });
          renderBillEditor();
          afterBillEdit();
        }
        if (t.id === "bDup" && bills[cur]) {
          const c = JSON.parse(JSON.stringify(bills[cur]));
          c.id = nextId++;
          bills.splice(cur + 1, 0, c);
          cur++;
          renderBillEditor();
          afterBillEdit();
        }
        if (t.id === "bDel" && bills[cur]) {
          bills.splice(cur, 1);
          cur = Math.min(cur, bills.length - 1);
          renderBillEditor();
          afterBillEdit();
        }
        if (t.id === "bAll" || t.id === "bNone") {
          bills.forEach((b) => (b.sel = t.id === "bAll"));
          renderBillList();
        }
        if (t.id === "bDelSel") {
          const cb = bills[cur];
          bills = bills.filter((b) => !b.sel);
          cur = Math.max(0, bills.indexOf(cb));
          if (!bills.length) cur = -1;
          renderBillEditor();
          afterBillEdit();
        }
        const card = t.closest && t.closest("[data-bpick]");
        if (card && t.tagName !== "INPUT") {
          cur = +card.dataset.bpick;
          renderBillList();
          renderBillEditor();
          renderPreview();
        }
      });
      $("#menuSearch").addEventListener("input", (e) => {
        e.stopPropagation();
        renderMenu();
      });

      // default bulk dates: the last 7 days
      $("#bTo").value = isoDate(now);
      $("#bFrom").value = isoDate(new Date(now.getTime() - 6 * 864e5));

      renderItemsEditor();
      renderMenu();
      syncBgControls();
      renderPreview();
    