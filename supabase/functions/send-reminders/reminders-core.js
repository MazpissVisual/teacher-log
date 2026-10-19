//#region src/util.ts
const ZONES = {
	"Asia/Jakarta": "Asia/Jakarta",
	"Asia/Pontianak": "Asia/Jakarta",
	"Asia/Makassar": "Asia/Makassar",
	"Asia/Ujung_Pandang": "Asia/Makassar",
	"Asia/Jayapura": "Asia/Jayapura"
};
const mapTz = (name) => name && ZONES[name] || "Asia/Jakarta";
const detectTz = () => {
	try {
		return mapTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
	} catch {
		return "Asia/Jakarta";
	}
};
detectTz();
/** YYYY-MM-DD in the given IANA timezone. */
function todayIn(tz, now = /* @__PURE__ */ new Date()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(now);
}
/** Whole days from `b` to `a` (a - b), for YYYY-MM-DD strings. */
function dayDiff(a, b) {
	const t = (d) => {
		const [y, m, day] = d.split("-").map(Number);
		return Date.UTC(y, m - 1, day);
	};
	return Math.round((t(a) - t(b)) / 864e5);
}
/** Day of week for a YYYY-MM-DD string: 0 = Sunday … 6 = Saturday. */
function weekdayOf(date) {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
/** Minutes since midnight in the given timezone. */
function minutesIn(tz, now = /* @__PURE__ */ new Date()) {
	const [h, m] = new Intl.DateTimeFormat("en-GB", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).format(now).split(":").map(Number);
	return h * 60 + m;
}
/** "08:30" → 510. Returns null when empty or malformed. */
function toMinutes(t) {
	const m = /^(\d{1,2}):(\d{2})$/.exec(t);
	return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
//#endregion
//#region src/agenda.ts
const KIND_LABEL = {
	kuliah: "Kuliah",
	kuis: "Kuis",
	uts: "UTS",
	uas: "UAS",
	deadline: "Deadline"
};
Object.keys(KIND_LABEL);
/** Everything happening on `date`: one-off plans plus the weekly classes that fall on that weekday. */
function agendaFor(db, date) {
	const plans = db.plans.filter((p) => p.date === date);
	const items = plans.map((p) => ({
		key: "plan:" + p.id,
		date,
		time: p.time,
		end: "",
		title: p.title,
		subject: p.subject,
		className: p.className,
		room: "",
		kind: p.kind,
		plan: p
	}));
	const wd = weekdayOf(date);
	for (const s of db.schedules) {
		if (s.day !== wd || s.until && date > s.until) continue;
		if (s.subject && plans.some((p) => p.kind === "kuliah" && p.subject === s.subject)) continue;
		items.push({
			key: "sch:" + s.id,
			date,
			time: s.start,
			end: s.end,
			title: s.subject || "Kuliah",
			subject: s.subject,
			className: s.className,
			room: s.room,
			kind: "kuliah",
			schedule: s
		});
	}
	return items.sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
}
//#endregion
//#region src/reminders-core.ts
const DEFAULT_PREFS = {
	enabled: false,
	deadlines: true,
	classes: true,
	thesis: true,
	leadMin: 15
};
const GROUP_URL = {
	deadlines: "/tasks",
	classes: "/planner",
	thesis: "/thesis"
};
const when = (d) => d < 0 ? `terlambat ${-d} hari` : d === 0 ? "hari ini" : d === 1 ? "besok" : `${d} hari lagi`;
function computeReminders(db, now, p) {
	const tz = db.profile.tz;
	const today = todayIn(tz, now);
	const nowMin = minutesIn(tz, now);
	const out = [];
	const add = (r) => out.push({
		...r,
		url: GROUP_URL[r.group]
	});
	if (p.deadlines) {
		for (const t of db.tasks) {
			if (t.done || !t.date) continue;
			const d = dayDiff(t.date, today);
			if (d > 1) continue;
			add({
				key: `task:${t.id}:${d < 0 ? "late:" + today : d}`,
				group: "deadlines",
				urgent: true,
				title: d < 0 ? `Tugas terlambat: ${t.title}` : `Tugas ${d === 0 ? "hari ini" : "besok"}: ${t.title}`,
				body: [t.subject, d < 0 ? when(d) : ""].filter(Boolean).join(" · ") || "Jangan lupa dikerjakan."
			});
		}
		for (const pl of db.plans) {
			if (pl.kind === "kuliah" || !pl.date) continue;
			const d = dayDiff(pl.date, today);
			const big = pl.kind === "uts" || pl.kind === "uas";
			if (d < 0 || !(d <= 1 || big && (d === 3 || d === 7))) continue;
			add({
				key: `plan:${pl.id}:${d}`,
				group: "deadlines",
				urgent: d <= 1,
				title: `${KIND_LABEL[pl.kind]} ${when(d)}: ${pl.title}`,
				body: [pl.subject, pl.time && `Pukul ${pl.time}`].filter(Boolean).join(" · ") || "Siapkan dirimu."
			});
		}
	}
	if (p.classes) for (const a of agendaFor(db, today)) {
		const start = toMinutes(a.time);
		if (start === null || nowMin > start || nowMin < start - p.leadMin) continue;
		const left = start - nowMin;
		add({
			key: `class:${a.key}:${today}`,
			group: "classes",
			urgent: true,
			title: `${a.kind === "kuliah" ? "" : KIND_LABEL[a.kind] + ": "}${a.title} ${left === 0 ? "dimulai sekarang" : `mulai ${left} menit lagi`}`,
			body: [`Pukul ${a.time}`, a.room].filter(Boolean).join(" · ")
		});
	}
	if (p.thesis) {
		for (const s of db.stages) {
			if (s.status === "done" || !s.date) continue;
			const d = dayDiff(s.date, today);
			if (d > 3) continue;
			add({
				key: `stage:${s.id}:${d < 0 ? "late:" + today : d}`,
				group: "thesis",
				urgent: d <= 1,
				title: `Tahap tesis ${when(d)}: ${s.title}`,
				body: s.note ? s.note.slice(0, 100) : "Cek progresmu."
			});
		}
		for (const g of db.guidance) {
			if (!g.date) continue;
			const d = dayDiff(g.date, today);
			if (d === 0 || d === 1) add({
				key: `guid:${g.id}:${d}`,
				group: "thesis",
				urgent: true,
				title: `Bimbingan ${when(d)}${g.lecturer ? " dengan " + g.lecturer : ""}`,
				body: g.notes ? g.notes.slice(0, 100) : "Siapkan bahan yang mau ditanyakan."
			});
		}
		const pending = db.guidance.filter((g) => g.followup && !g.followupDone).length;
		if (pending) add({
			key: `followup:${today}`,
			group: "thesis",
			urgent: false,
			title: `${pending} tindak lanjut bimbingan belum selesai`,
			body: "Buka halaman Tesis untuk melihat daftarnya."
		});
	}
	return out;
}
//#endregion
export { DEFAULT_PREFS, computeReminders, todayIn };
