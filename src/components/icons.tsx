// Icônes SVG outline — style SaaS cohérent
// Toutes en 24x24, strokeWidth 1.5

/** Logo Qomand — version complète avec texte */
export function Logo({ className = 'h-10', white = true }: { className?: string; white?: boolean }) {
  const color = white ? '#fff' : '#000';
  
  return (
    <svg className={className} viewBox="0 0 683.844 144.81" style={{ height: '45px', width: 'auto' }} xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-475.156 -467.17)">
        <path d="M49.932-87.21A44.481,44.481,0,0,0,5.472-42.75,44.591,44.591,0,0,0,49.932,1.71a44.481,44.481,0,0,0,44.46-44.46A44.371,44.371,0,0,0,49.932-87.21ZM25.65-42.75A24.376,24.376,0,0,1,49.932-67.032,24.376,24.376,0,0,1,74.214-42.75,24.376,24.376,0,0,1,49.932-18.468,24.376,24.376,0,0,1,25.65-42.75ZM110.808,0h20.178V-46.17c0-13.509,9.063-22.059,20.691-22.059,10.773,0,18.3,6.669,18.3,21.033V0h20.178V-46.512c0-13.167,9.063-21.717,20.691-21.717,10.773,0,18.3,6.669,18.3,21.033V0h20.178V-51.471c0-21.717-13.68-35.739-33.516-35.739-13.68,0-22.743,6.327-30.438,16.074-5.472-10.089-15.732-16.074-28.728-16.074a35.474,35.474,0,0,0-25.65,10.944V-85.5H110.808ZM382.7,0V-46.17c0-13.509,9.063-22.059,20.691-22.059,10.773,0,18.3,6.669,18.3,21.033V0h20.178V-51.471c0-21.717-13.68-35.739-33.516-35.739A35.474,35.474,0,0,0,382.7-76.266V-85.5H362.52V0Z" transform="translate(615 592)" fill={color}/>
        <path d="M6.156-61.56A63.346,63.346,0,0,0,69.426,1.71a61.581,61.581,0,0,0,32.49-9.234l24.672,27.5L141.465,6.471,117.477-20.52A62.862,62.862,0,0,0,132.7-61.56a63.346,63.346,0,0,0-63.27-63.27A63.346,63.346,0,0,0,6.156-61.56Zm63.27-43.092A43.131,43.131,0,0,1,112.518-61.56a42.485,42.485,0,0,1-8.892,25.821s12.123,13.178,13.851,15.219-13.73,14.967-15.561,13S87.723-23.256,87.723-23.256a36.951,36.951,0,0,1-18.3,4.788A43.131,43.131,0,0,1,26.334-61.56,43.131,43.131,0,0,1,69.426-104.652Z" transform="translate(469 592)" fill={color}/>
        <path d="M44,88A44.012,44.012,0,0,1,26.873,3.458,44.011,44.011,0,0,1,61.127,84.542,43.723,43.723,0,0,1,44,88Zm0-67.8a23.721,23.721,0,1,0,9.262,1.87A23.646,23.646,0,0,0,44,20.2Z" transform="translate(876 506)" fill={color}/>
        <rect width="19.9" height="43" transform="translate(944 550)" fill={color}/>
        <path d="M44,88A44.012,44.012,0,0,1,26.873,3.458,44.011,44.011,0,0,1,61.127,84.542,43.723,43.723,0,0,1,44,88Zm0-67.8a23.721,23.721,0,1,0,9.262,1.87A23.646,23.646,0,0,0,44,20.2Z" transform="translate(1071 506)" fill={color}/>
        <rect width="20" height="125" transform="translate(1139 469)" fill={color}/>
      </g>
    </svg>
  );
}

/** Logo Qomand — icône seule (Q avec loupe) */
export function IconLogo({ className = 'w-6 h-6', white = true }: { className?: string; white?: boolean }) {
  const bgColor = white ? '#F07A4F' : '#F07A4F';
  const fgColor = white ? '#fff' : '#000';
  
  return (
    <svg className={className} viewBox="0 0 275 275" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-128 -1160)">
        <rect width="275" height="275" rx="25" transform="translate(128 1160)" fill={bgColor}/>
        <path d="M6.156-61.56A63.346,63.346,0,0,0,69.426,1.71a61.581,61.581,0,0,0,32.49-9.234l24.672,27.5L141.465,6.471,117.477-20.52A62.862,62.862,0,0,0,132.7-61.56a63.346,63.346,0,0,0-63.27-63.27A63.346,63.346,0,0,0,6.156-61.56Zm63.27-43.092A43.131,43.131,0,0,1,112.518-61.56a42.485,42.485,0,0,1-8.892,25.821s12.123,13.178,13.851,15.219-13.73,14.967-15.561,13S87.723-23.256,87.723-23.256a36.951,36.951,0,0,1-18.3,4.788A43.131,43.131,0,0,1,26.334-61.56,43.131,43.131,0,0,1,69.426-104.652Z" transform="translate(191.69 1349.925)" fill={fgColor}/>
      </g>
    </svg>
  );
}

export function IconHome({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {/* Assiette avec fourchette et couteau — logo restaurant */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9 8v2.5a1.5 1.5 0 0 0 3 0V8M10.5 10.5V16M14.5 8v8" />
    </svg>
  )
}

export function IconMenu({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
    </svg>
  )
}

export function IconTable({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {/* Chaise vue de face */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8M8 4v9M16 4v9M8 9h8M5.5 13h13M6.5 13v7M17.5 13v7" />
    </svg>
  )
}

export function IconOrders({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {/* Ticket / reçu simplifié */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h7.5M8.25 11.25h7.5M8.25 15h4.5M4.5 5.25a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 .75.75v15a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75v-15Z" />
    </svg>
  )
}

export function IconSettings({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

export function IconLogout({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
    </svg>
  )
}

export function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

export function IconQR({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
    </svg>
  )
}

export function IconReceipt({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
    </svg>
  )
}

export function IconEye({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

export function IconDownload({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

export function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

export function IconCreditCard({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  )
}

export function IconBanknote({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  )
}

export function IconGlobe({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  )
}
