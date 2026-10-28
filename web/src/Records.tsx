import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  Catalog,
  Locale,
  Side,
  SorenessRecord,
  Structure,
  User,
} from "./types";
import { errorText, t, text } from "./i18n";
import { request } from "./api";
import { localDate, recordPayload } from "./planner";
type Legacy = {
  id: string;
  name: string;
  nameEn?: string;
  nameZh?: string;
  side: Side;
};
type Draft = Omit<SorenessRecord, "id"> & { id?: number };
const pageSize = 10;
export function Records({
  catalog,
  locale,
  user,
  setUser,
  selected,
  onSelect,
}: {
  catalog: Catalog;
  locale: Locale;
  user: User | null;
  setUser: (value: User | null) => void;
  selected?: Structure;
  onSelect: (id: string) => void;
}) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState<"saved" | "deleted">();
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [records, setRecords] = useState<SorenessRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "" });
  const [draft, setDraft] = useState<Draft>(() => ({
    date: localDate(),
    structureId: selected?.id ?? "",
    side: selected?.side ?? "midline",
    intensity: 3,
    note: "",
  }));
  const [legacy, setLegacy] = useState<Record<string, Legacy>>({});
  const [pendingDelete, setPendingDelete] = useState<SorenessRecord>();
  useEffect(() => {
    if (!draft.id && selected)
      setDraft((value) => ({
        ...value,
        structureId: selected.id,
        side: selected.side,
      }));
  }, [selected?.id]);
  useEffect(() => {
    if (!user) {
      setRecords([]);
      setTotal(0);
      return;
    }
    const abort = new AbortController();
    setHistoryBusy(true);
    setError(undefined);
    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String(page * pageSize),
    });
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    void request<{ records: SorenessRecord[]; total: number }>(
      `/api/records?${params}`,
      { signal: abort.signal },
    )
      .then((data) => {
        setRecords(data.records);
        setTotal(data.total);
        if (page > 0 && data.records.length === 0 && data.total > 0)
          setPage(Math.max(0, Math.ceil(data.total / pageSize) - 1));
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e);
          if (["UNAUTHENTICATED", "AUTH_REQUIRED"].includes(e.message))
            setUser(null);
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setHistoryBusy(false);
      });
    return () => abort.abort();
  }, [user?.id, page, filter, refresh]);
  useEffect(() => {
    if (
      !records.some((record) => !catalog.structures[record.structureId]) ||
      Object.keys(legacy).length
    )
      return;
    const abort = new AbortController();
    void request<{ structures: Legacy[] }>("/models/manifest.json", {
      signal: abort.signal,
    })
      .then((data) =>
        setLegacy(Object.fromEntries(data.structures.map((s) => [s.id, s]))),
      )
      .catch(() => {});
    return () => abort.abort();
  }, [records, catalog]);
  const name = (id: string) =>
    catalog.structures[id]
      ? text(locale, catalog.structures[id].name)
      : locale === "en"
        ? (legacy[id]?.nameEn ??
          legacy[id]?.name ??
          `${t(locale, "historic")} ${id}`)
        : (legacy[id]?.nameZh ??
          legacy[id]?.nameEn ??
          legacy[id]?.name ??
          `${t(locale, "historic")} ${id}`);
  function resetDraft() {
    setDraft({
      date: localDate(),
      structureId: selected?.id ?? "",
      side: selected?.side ?? "midline",
      intensity: 3,
      note: "",
    });
    setError(undefined);
  }
  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const data = await request<{ user: User }>(`/api/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      setPassword("");
      setPage(0);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError(undefined);
    try {
      await request("/api/auth/logout", { method: "POST" });
      setUser(null);
      setRecords([]);
      setTotal(0);
      resetDraft();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.structureId) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await request(draft.id ? `/api/records/${draft.id}` : "/api/records", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(recordPayload(draft, catalog)),
      });
      setNotice("saved");
      resetDraft();
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!pendingDelete) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await request(`/api/records/${pendingDelete.id}`, { method: "DELETE" });
      if (draft.id === pendingDelete.id) resetDraft();
      setPendingDelete(undefined);
      setNotice("deleted");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function edit(record: SorenessRecord) {
    setDraft({ ...record });
    onSelect(record.structureId);
    setNotice(undefined);
    setError(undefined);
    document
      .getElementById("record-form")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  const structures = Object.values(catalog.structures).sort((a, b) =>
    text(locale, a.name).localeCompare(
      text(locale, b.name),
      locale === "zh" ? "zh-CN" : "en",
    ),
  );
  return (
    <div className="records">
      {Boolean(error) && (
        <p className="error-message" role="alert">
          {errorText(locale, error)}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {t(locale, notice)}
        </p>
      )}
      {!user ? (
        <>
          <p className="hint">{t(locale, "accountHint")}</p>
          <div className="segmented">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setError(undefined);
              }}
            >
              {t(locale, "login")}
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => {
                setAuthMode("register");
                setError(undefined);
              }}
            >
              {t(locale, "register")}
            </button>
          </div>
          <form onSubmit={authenticate} className="form">
            <label className="field">
              <span>{t(locale, "username")}</span>
              <input
                autoComplete="username"
                required
                pattern="[A-Za-z0-9_]{3,32}"
                minLength={3}
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t(locale, "password")}</span>
              <input
                type="password"
                autoComplete={
                  authMode === "register" ? "new-password" : "current-password"
                }
                required
                minLength={10}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <p className="hint">{t(locale, "credentialsHint")}</p>
            <button className="primary wide" disabled={busy}>
              {t(locale, busy ? "busy" : authMode)}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="account-row">
            <span>{user.username}</span>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => void logout()}
            >
              {t(locale, "logout")}
            </button>
          </div>
          <form id="record-form" className="form detail-card" onSubmit={save}>
            <h3>{t(locale, draft.id ? "edit" : "newRecord")}</h3>
            <label className="field">
              <span>{t(locale, "structure")}</span>
              <select
                required
                value={draft.structureId}
                onChange={(event) => {
                  const s = catalog.structures[event.target.value];
                  setDraft((value) => ({
                    ...value,
                    structureId: s.id,
                    side: s.side,
                  }));
                  onSelect(s.id);
                }}
              >
                <option value="" disabled>
                  {t(locale, "selectStructure")}
                </option>
                {draft.structureId &&
                  !catalog.structures[draft.structureId] && (
                    <option value={draft.structureId}>
                      {name(draft.structureId)}
                    </option>
                  )}
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {text(locale, s.name)}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <label className="field">
                <span>{t(locale, "date")}</span>
                <input
                  type="date"
                  required
                  min="1900-01-01"
                  max="9999-12-31"
                  value={draft.date}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      date: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{t(locale, "side")}</span>
                <input
                  readOnly
                  value={t(
                    locale,
                    catalog.structures[draft.structureId]?.side ?? draft.side,
                  )}
                />
              </label>
            </div>
            <label className="field">
              <span>
                {t(locale, "intensity")} <b>{draft.intensity}/10</b>
              </span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={draft.intensity}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    intensity: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>{t(locale, "note")}</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={draft.note}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, note: event.target.value }))
                }
              />
            </label>
            <div className="button-row">
              <button className="primary" disabled={busy || !draft.structureId}>
                {t(locale, busy ? "saving" : "save")}
              </button>
              {draft.id && (
                <button type="button" disabled={busy} onClick={resetDraft}>
                  {t(locale, "cancel")}
                </button>
              )}
            </div>
          </form>
          <div className="section-heading">
            <h3>{t(locale, "history")}</h3>
            <span className="tag">
              {total} {t(locale, "total")}
            </span>
          </div>
          <p className="hint">{t(locale, "historyHint")}</p>
          <form
            className="history-filter"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
              setFilter({ from, to });
            }}
          >
            <div className="field-row">
              <label className="field">
                <span>{t(locale, "from")}</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </label>
              <label className="field">
                <span>{t(locale, "to")}</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                />
              </label>
            </div>
            <button className="wide" disabled={historyBusy}>
              {t(locale, "filter")}
            </button>
          </form>
          {historyBusy && (
            <p role="status" className="hint">
              {t(locale, "busy")}
            </p>
          )}
          <div className="history-list">
            {records.map((record) => (
              <article key={record.id} className="history-card">
                <div className="history-title">
                  <strong>{name(record.structureId)}</strong>
                  <span className="intensity">{record.intensity}/10</span>
                </div>
                <p className="hint">
                  {record.date} · {t(locale, record.side)}
                </p>
                {record.note && <p className="record-note">{record.note}</p>}
                <div className="button-row">
                  <button disabled={busy} onClick={() => edit(record)}>
                    {t(locale, "edit")}
                  </button>
                  <button
                    className="danger text-button"
                    disabled={busy}
                    onClick={() => setPendingDelete(record)}
                  >
                    {t(locale, "delete")}
                  </button>
                </div>
              </article>
            ))}
            {!records.length && !historyBusy && (
              <p className="empty">{t(locale, "noRecords")}</p>
            )}
          </div>
          <div className="pagination">
            <button
              disabled={page === 0 || historyBusy}
              onClick={() => setPage((x) => x - 1)}
            >
              {t(locale, "previous")}
            </button>
            <span>
              {page + 1} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              disabled={(page + 1) * pageSize >= total || historyBusy}
              onClick={() => setPage((x) => x + 1)}
            >
              {t(locale, "next")}
            </button>
          </div>
        </>
      )}
      {pendingDelete && (
        <div className="modal-backdrop">
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <h3 id="delete-title">{t(locale, "deleteRecord")}</h3>
            <p id="delete-description">{t(locale, "confirmDelete")}</p>
            <p className="hint">
              {name(pendingDelete.structureId)} · {pendingDelete.date}
            </p>
            <div className="button-row">
              <button
                autoFocus
                disabled={busy}
                onClick={() => setPendingDelete(undefined)}
              >
                {t(locale, "cancel")}
              </button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={() => void remove()}
              >
                {t(locale, busy ? "busy" : "delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
