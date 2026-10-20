// In-memory fake API for running the frontend without the backend (npm run demo). Resets on reload.
const subjects = [
  { id: 1, name: "Data Structures", department: "Computer Science", semester: 3 },
  { id: 2, name: "Database Management Systems", department: "Computer Science", semester: 4 },
  { id: 3, name: "Operating Systems", department: "Computer Science", semester: 5 },
  { id: 4, name: "Engineering Mathematics I", department: "General", semester: 1 },
];
const demoUser = { id: 1, name: "Demo Student", email: "demo@example.com", role: "STUDENT" };
const users = [{ ...demoUser, password: "password123" }];
let me = null;
let nextId = 4;
const day = 864e5;
const materials = [
  ["Data Structures Unit 1 Notes", "Arrays, linked lists, and stacks", 1, 1, 0],
  ["DBMS Normalization Cheat Sheet", "1NF to BCNF with examples", 2, 1, 1],
  ["OS Scheduling Algorithms", "FCFS, SJF, Round Robin", 3, 2, 2],
].map(([title, description, subjectId, uid, ago], i) => ({
  id: i + 1, title, description, originalFilename: `${title}.pdf`, fileSize: 250000 + i * 90000,
  subjectId, subjectName: subjects.find((s) => s.id === subjectId).name,
  uploadedById: uid, uploadedByName: "Demo Student", createdAt: new Date(Date.now() - ago * day).toISOString(),
}));

const fail = (status, error, config) =>
  Promise.reject({ message: error, response: { status, data: { error }, config } });

export default async function mockAdapter(config) {
  const url = config.url;
  const method = config.method.toLowerCase();
  const params = config.params ?? {};
  const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
  const ok = (data, status = 200) => Promise.resolve({ data, status, statusText: "OK", headers: {}, config });
  await new Promise((r) => setTimeout(r, 150));

  if (url === "/auth/me") return me ? ok(me) : fail(401, "Unauthorized", config);
  if (url === "/auth/login") {
    const u = users.find((x) => x.email === body.email && x.password === body.password);
    if (!u) return fail(401, "Invalid email or password", config);
    const { password, ...pub } = u;
    me = pub;
    return ok(pub);
  }
  if (url === "/auth/register") {
    if (users.some((x) => x.email === body.email)) return fail(409, "Email is already registered", config);
    users.push({ id: users.length + 1, name: body.name, email: body.email, role: "STUDENT", password: body.password });
    return ok({}, 201);
  }
  if (url === "/auth/logout") { me = null; return ok({}, 204); }
  if (url === "/subjects") return ok(subjects);

  const sorted = () => [...materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (url === "/materials" && method === "get") {
    const sid = params.subjectId ? Number(params.subjectId) : null;
    return ok(sorted().filter((m) => !sid || m.subjectId === sid).slice(0, params.size ?? 20));
  }
  if (url === "/users/me/materials") return me ? ok(sorted().filter((m) => m.uploadedById === me.id)) : fail(401, "Unauthorized", config);
  if (url === "/materials" && method === "post") {
    if (!me) return fail(401, "Unauthorized", config);
    const file = body.get("file");
    const subject = subjects.find((s) => s.id === Number(body.get("subjectId")));
    if (file.type !== "application/pdf") return fail(400, "Only PDF files are allowed", config);
    const m = {
      id: nextId++, title: body.get("title"), description: body.get("description"), originalFilename: file.name,
      fileSize: file.size, subjectId: subject.id, subjectName: subject.name,
      uploadedById: me.id, uploadedByName: me.name, createdAt: new Date().toISOString(),
    };
    materials.push(m);
    return ok(m, 201);
  }
  const del = url.match(/^\/materials\/(\d+)$/);
  if (del && method === "delete") {
    const i = materials.findIndex((m) => m.id === Number(del[1]));
    if (i < 0) return fail(404, "Material not found", config);
    if (!me || materials[i].uploadedById !== me.id) return fail(403, "You can only delete your own uploads", config);
    materials.splice(i, 1);
    return ok({}, 204);
  }
  return fail(404, "Not found", config);
}
