// Макеты интерфейса для витрины. Все данные в них — примеры, это подписано в шапке каждого макета.

type Line = [who: "c" | "m", text: string, time: string];

export const HERO_CHAT: Line[] = [
  ["c", "Здравствуйте, увидела рекламу check-up сердца. Сколько стоит?", "23:41"],
  ["m", "Здравствуйте! Check-up «Сердце» стоит 35 000 ₸: ЭКГ, УЗИ сердца, анализы и приём кардиолога за один визит. Как к вам обращаться?", "23:41"],
  ["c", "Айгерим. Дороговато, подумаю", "23:42"],
  ["m", "Понимаю, Айгерим. По отдельности эти обследования выйдут дороже, а здесь кардиолог сразу даст заключение. Можно оплатить в рассрочку Kaspi Red. Удобнее в субботу в 10:00 или в понедельник в 17:00?", "23:42"],
  ["c", "Суббота подойдёт, +7 707 ··· ·· 14", "23:43"],
  ["m", "Готово, Айгерим, вы записаны на субботу, 10:00, пр. Кабанбай батыра 10. Накануне пришлём напоминание. До встречи!", "23:43"],
];

export function ChatMock({ lines = HERO_CHAT, title = "Клиника «Шипагер»", letter = "Ш" }: { lines?: Line[]; title?: string; letter?: string }) {
  return (
    <div className="ui">
      <div className="ui-head">
        <div className="ava">{letter}</div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
          <b>{title}</b>
          <span className="online">ИИ-менеджер · онлайн</span>
        </div>
        <span className="mono muted" style={{ marginLeft: "auto" }}>пример</span>
      </div>
      <div className="msgs">
        {lines.map(([who, text, time], i) => (
          <div key={i} className={who === "c" ? "msg me" : "msg"}>
            {text}
            <time>{time}</time>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadCardMock() {
  return (
    <div className="ui">
      <div className="ui-head">
        <b>Карточка лида</b>
        <span className="chip hot" style={{ marginLeft: "auto" }}>горячий · 82%</span>
      </div>
      <dl className="kv">
        <dt>Клиент</dt><dd>Айгерим</dd>
        <dt>Услуга</dt><dd>Check-up «Сердце»</dd>
        <dt>Когда</dt><dd className="num">Сб, 10:00</dd>
        <dt>Сумма</dt><dd className="num">35 000 ₸</dd>
        <dt>Возражение</dt><dd>«дорого» — снято рассрочкой</dd>
        <dt>Шаг</dt><dd>позвонить в пятницу и подтвердить</dd>
      </dl>
      <div style={{ padding: "0 14px 14px" }}><div className="meter"><i style={{ width: "82%" }} /></div></div>
    </div>
  );
}

export function ReportMock() {
  const rows: [string, string][] = [
    ["Новых диалогов", "47"],
    ["Записались", "19"],
    ["Конверсия в запись", "40%"],
    ["Ответ бота, медиана", "6 с"],
    ["Передано менеджеру", "5"],
  ];
  return (
    <div className="ui">
      <div className="ui-head">
        <div className="ava">A</div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
          <b>Отчёт за день · Telegram</b>
          <span className="mono muted">пример · 09:00</span>
        </div>
      </div>
      <dl className="kv">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd className="num">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CallMock() {
  return (
    <div className="ui">
      <div className="ui-head">
        <b>Разбор звонка</b>
        <span className="mono muted" style={{ marginLeft: "auto" }}>пример · 04:12</span>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="muted">Оценка по скрипту</span>
          <b className="ink num">86 / 100</b>
        </div>
        <div className="meter"><i style={{ width: "86%" }} /></div>
        <div className="tags" style={{ marginTop: 4 }}>
          <span>цена</span><span>сроки</span><span>доставка</span><span>условия оплаты</span>
        </div>
        <p className="ink">Рекомендация: отправить коммерческое предложение сегодня, клиент сравнивает с конкурентом.</p>
      </div>
    </div>
  );
}

export function BroadcastMock() {
  return (
    <div className="ui">
      <div className="ui-head">
        <b>Рассылка «Запись на октябрь»</b>
        <span className="chip soon" style={{ marginLeft: "auto" }}>макет</span>
      </div>
      <div className="msgs">
        <div className="msg">Айгерим, здравствуйте! В октябре открыли запись к кардиологу на субботу. Подобрать удобное время?<time>шаблон · маркетинг</time></div>
        <div className="msg me">Да, давайте на утро<time>10:14</time></div>
        <div className="msg">Отлично! Свободно в субботу в 9:00 и 11:30. Какое время удобнее?<time>ИИ-менеджер</time></div>
      </div>
      <dl className="kv">
        <dt>Отправлено</dt><dd className="num">1 200</dd>
        <dt>Доставлено</dt><dd className="num">1 164</dd>
        <dt>Ответили</dt><dd className="num">211</dd>
      </dl>
    </div>
  );
}

/** Кабинет: дашборд, где реклама из Meta стоит рядом со сделками из amoCRM и Битрикс24. */
export function DashMock() {
  const bars = [5, 7, 4, 8, 6, 9, 7, 10, 8, 12, 9, 11, 13, 10];
  const won = [2, 3, 1, 3, 2, 4, 3, 4, 3, 5, 4, 4, 6, 4];
  const max = Math.max(...bars);
  const src: [string, string, string][] = [["Meta Ads", "688 239 ₸", "230 лидов"], ["amoCRM", "64 сделки", "19 оплат"], ["Битрикс24", "41 сделка", "13 оплат"]];
  return (
    <div className="ui dash-mock">
      <div className="ui-head">
        <b>Дашборд · продажи и реклама</b>
        <span className="mono muted" style={{ marginLeft: "auto" }}>пример</span>
      </div>
      <div className="dm-kpis">
        <div><span>Выручка</span><b className="num">961 000 ₸</b></div>
        <div><span>Цена лида</span><b className="num">2 992 ₸</b></div>
        <div><span>ROMI</span><b className="num">+38%</b></div>
      </div>
      <div className="dm-bars" aria-hidden="true">
        {bars.map((b, i) => (
          <span key={i} style={{ height: `${(b / max) * 100}%` }}><i style={{ height: `${(won[i] / b) * 100}%` }} /></span>
        ))}
      </div>
      <dl className="kv">
        {src.map(([k, a, b]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd className="num">{a} · {b}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
