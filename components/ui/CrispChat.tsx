import Script from 'next/script'

// Crisp live chat. Loads only when NEXT_PUBLIC_CRISP_WEBSITE_ID is set, so the
// site falls back to the built-in AI widget until Crisp is configured. Crisp
// gives live human chat (reply from the phone/desktop app), with AI handled on
// Crisp's side. Their script renders its own bubble — keep only one chat widget.
export function CrispChat({ websiteId }: { websiteId: string }) {
  return (
    <Script id="crisp-chat" strategy="afterInteractive">
      {`window.$crisp=[];window.CRISP_WEBSITE_ID="${websiteId}";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
    </Script>
  )
}
