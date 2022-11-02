export default function Homepage() {
  return (
    <div>
      {/*  HERO SECTION */}
      <section className="min-h-screen hero bg-base-200">
        <div className="text-center hero-content">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Locul tău de învățat.</h1>
            <p className="py-6">
              Platforma ITC oferă cursuri în mod gratuit pentru toți cei
              pasionați de domeniul cibersecurității. Fă-ți un cont chiar acum!
            </p>
            <button className="btn btn-primary">Autentificare</button>
          </div>
        </div>
      </section>
    </div>
  );
}
