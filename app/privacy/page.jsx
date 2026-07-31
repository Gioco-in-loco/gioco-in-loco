export const metadata = {
  title: 'Privacy Policy | Gioco In Loco',
}

export default function PrivacyPage() {
  const sections = [
    {
      title: 'Quali dati usiamo',
      body: 'Usiamo i dati che ci servono per far funzionare il tuo account e il sito: per esempio nome, email, numero di telefono se lo inserisci, dati legati alle prenotazioni e alcune statistiche anonime sulle visite alle pagine.',
    },
    {
      title: 'Cosa non facciamo',
      body: 'Non usiamo i tuoi dati per pubblicita, non li vendiamo, non tracciamo la tua navigazione per profilarti e non colleghiamo le statistiche del sito al tuo account personale.',
    },
    {
      title: 'Perche li usiamo',
      body: 'Li usiamo per permetterti di accedere al sito, gestire il tuo profilo, usare le funzioni collegate agli eventi e migliorare la piattaforma capendo in generale quante visite riceve e quali sezioni interessano di piu.',
    },
    {
      title: 'Per quanto tempo',
      body: 'Le statistiche anonime sulle visite vengono conservate per un massimo di 90 giorni e poi eliminate automaticamente. Gli altri dati del tuo account restano disponibili finche il tuo profilo e attivo o finche la legge lo richiede.',
    },
    {
      title: 'I tuoi diritti',
      body: 'Puoi chiedere la correzione o la cancellazione dei tuoi dati, oppure aggiornare direttamente le informazioni del profilo quando questa funzione e disponibile nel sito. Le informazioni del servizio sono consultabili solo da persone autorizzate alla gestione della piattaforma.',
    },
  ]

  return (
    <section className="px-6 py-16 md:px-10 lg:px-16">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-editorial-border shadow-soft p-8 md:p-10">
        <p className="font-body text-xs uppercase tracking-widest text-editorial-terra mb-2 font-semibold">Privacy</p>
        <h1 className="font-elegant text-4xl md:text-5xl text-editorial-text font-bold mb-4">Informativa privacy essenziale</h1>
        <p className="font-body text-base text-editorial-text-secondary leading-relaxed mb-8">
          Questa informativa spiega in modo semplice quali dati usiamo, perche li usiamo e quali tutele adottiamo.
          L&apos;obiettivo e permetterti di usare il sito in sicurezza e migliorare il servizio senza raccogliere informazioni superflue.
        </p>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-editorial-border bg-editorial-bg/60 p-5">
              <h2 className="font-elegant text-2xl text-editorial-text font-bold mb-2">{section.title}</h2>
              <p className="font-body text-sm md:text-base text-editorial-text-secondary leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}