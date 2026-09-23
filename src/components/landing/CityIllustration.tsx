export function CityIllustration() {
  return <svg viewBox="0 0 680 490" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Иллюстрация Астаны: Байтерек, современные здания и зелёные кварталы" className="city-illustration">
    <defs>
      <linearGradient id="city-sky" x1="340" y1="0" x2="340" y2="490" gradientUnits="userSpaceOnUse"><stop stopColor="#e1eee6" /><stop offset="1" stopColor="#f1f3e9" /></linearGradient>
      <linearGradient id="city-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bed8cf" /><stop offset="1" stopColor="#6eaaa0" /></linearGradient>
      <pattern id="city-windows" width="17" height="22" patternUnits="userSpaceOnUse"><rect x="5" y="5" width="5" height="11" rx="1" fill="#f1f7ef" opacity=".7" /></pattern>
      <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" stroke="#a9c2b5" strokeWidth=".5" opacity=".3" /></pattern>
    </defs>
    <rect width="680" height="490" rx="28" fill="url(#city-sky)" /><rect width="680" height="490" rx="28" fill="url(#city-grid)" /><circle cx="439" cy="164" r="100" fill="#f8f3cf" opacity=".9" />
    <path d="M0 360L343 230 680 346V490H0Z" fill="#c8deca" />
    <path d="M-20 424L310 280 707 401" stroke="#f6f7ee" strokeWidth="49" /><path d="M-20 424L310 280 707 401" stroke="#aebbb0" strokeWidth="26" /><path d="M-20 424L310 280 707 401" stroke="#ecf0e7" strokeWidth="2" strokeDasharray="12 14" />
    <path d="M365 490L281 438 511 343" stroke="#f6f7ee" strokeWidth="43" /><path d="M365 490L281 438 511 343" stroke="#aebbb0" strokeWidth="23" /><path d="M365 490L281 438 511 343" stroke="#ecf0e7" strokeWidth="2" strokeDasharray="10 12" /><path d="M3 467C121 426 164 467 245 490H0Z" fill="#84bfb5" />
    <g opacity=".65"><path d="M49 297V191L92 175 121 189V320Z" fill="#aac9bd" /><path d="M121 320V189L152 198V308Z" fill="#8eafa1" /><path d="M488 300V169L526 154 555 167V321Z" fill="#bed0bf" /><path d="M555 321V167L581 178V309Z" fill="#a6bfac" /></g>
    <path d="M122 332V193L187 173 220 185V363Z" fill="url(#city-glass)" /><path d="M220 363V185L251 202V346Z" fill="#63998a" /><path d="M131 326V200L210 179V350" fill="url(#city-windows)" /><path d="M153 185V171L191 159 222 173V186" fill="#c8ded1" />
    <path d="M401 335V179L440 131 483 172V364Z" fill="#85b2a8" /><path d="M440 131L452 183V352L483 364V172Z" fill="#4f887f" /><path d="M410 323V184L435 158V338" fill="url(#city-windows)" />
    <path d="M516 375V258L561 243 601 260V404Z" fill="#f7f4e6" /><path d="M601 404V260L627 275V390Z" fill="#d3d7bf" /><path d="M527 271L587 254M527 291L587 274M527 311L587 294M527 331L587 314M527 351L587 334M527 371L587 354" stroke="#9eb5a0" strokeWidth="7" />
    <ellipse cx="338" cy="363" rx="54" ry="17" fill="#a5c4aa" /><ellipse cx="332" cy="350" rx="42" ry="13" fill="#f7f3dd" /><path d="M311 344L318 235M353 344L344 235M318 341L331 232M346 341L333 232" stroke="#f9f6e6" strokeWidth="7" /><path d="M312 340H352M316 303H349M317 278H348" stroke="#d4d3b3" strokeWidth="4" /><path d="M317 245L300 215M346 245L363 215M325 242L311 211M339 242L354 211" stroke="#f7f3de" strokeWidth="5" />
    <circle cx="332" cy="207" r="31" fill="#c5a967" /><circle cx="325" cy="199" r="24" fill="#e2cc8a" /><path d="M307 197H356M305 210H360M317 181C306 218 334 241 348 184M332 177V236" stroke="#bd9b4e" strokeWidth="1.2" opacity=".65" /><path d="M324 174L332 151 340 174" fill="#f7f3de" />
    <g fill="#648f72">{[[67,345],[90,360],[273,328],[267,292],[471,389],[492,403],[562,432],[157,414],[202,395],[604,332],[626,344],[368,401]].map(([x,y],i)=><g key={i}><path d={`M${x} ${y+13}v-27`} stroke="#658569" strokeWidth="4" /><ellipse cx={x} cy={y-15} rx="13" ry="20" fill={i%2 ? "#60957a" : "#83aa78"} /></g>)}</g>
    <g fill="#edf2e7"><rect x="128" y="379" width="22" height="10" rx="4" transform="rotate(-23 128 379)" /><rect x="403" y="328" width="24" height="11" rx="4" transform="rotate(18 403 328)" /></g><path d="M88 112h57m-28-28v57M571 108h25m-12-12v25" stroke="#729a84" opacity=".5" /><circle cx="332" cy="352" r="64" stroke="#377d63" strokeDasharray="4 6" opacity=".3" />
  </svg>;
}
