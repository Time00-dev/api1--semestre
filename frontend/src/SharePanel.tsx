import { Button, Dialog, TextInput } from '@primer/react';
import { CopyIcon, DownloadIcon } from '@primer/octicons-react';
import { useRef, useState } from 'react';

const publicUrl = 'https://time00-dev.github.io/api1--semestre/';
const qrPath = import.meta.env.BASE_URL + 'qr-painel.png';

export function SharePanel({ close }: { close: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState('');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setFeedback('Link copiado.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setFeedback('Endereço selecionado para copiar.');
    }
  }

  return <Dialog title="Compartilhar painel" onClose={close} width="large" height="auto">
    <div className="share-panel">
      <img className="presentation-qr" src={qrPath} alt="QR Code para abrir Negado pelo Banco no GitHub Pages" width={420} height={420} />
      <TextInput ref={input} aria-label="Endereço público do painel" value={publicUrl} readOnly block />
      <div className="share-actions">
        <Button variant="primary" leadingVisual={CopyIcon} onClick={copyLink}>Copiar link</Button>
        <Button as="a" href={qrPath} download="qr-negado-pelo-banco.png" leadingVisual={DownloadIcon}>Baixar QR Code</Button>
      </div>
      {feedback && <p className="muted" role="status">{feedback}</p>}
    </div>
  </Dialog>;
}
