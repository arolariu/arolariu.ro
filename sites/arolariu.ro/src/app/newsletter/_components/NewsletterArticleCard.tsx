/** @format */

/**
 * A newsletter article card.
 * @returns  The newsletter article card.
 */
export default function NewsletterArticleCard() {
  return (
    <div>
      <p className='mb-3 pt-12 text-sm font-normal'>April 16, 2020</p>
      <h2 className='mb-2 text-xl font-extrabold leading-snug tracking-tight md:text-3xl'>
        <a
          href='#'
          className='hover:underline'>
          Lorem, ipsum dolor sit amet consectetur adipisicing.
        </a>
      </h2>
      <p className='mb-4 text-base font-normal'>
        Lorem ipsum dolor, sit amet consectetur adipisicing elit. Adipisci corrupti laudantium enim quas ab ratione
        repellendus itaque nobis, nisi sit reprehenderit cupiditate eligendi possimus. Fuga assumenda reiciendis
        doloremque, maxime dolor quo voluptatem rerum quis architecto distinctio pariatur nemo fugiat quod ipsa labore
        nesciunt soluta. Ad, laborum. Rerum saepe soluta blanditiis eveniet, porro similique amet nostrum iure modi
        reiciendis eligendi magnam atque dolores quaerat eius aperiam provident eaque optio dignissimos repellendus.
      </p>
      <a
        href='#'
        className='btn-light btn btn-sm hover:underline'>
        Continue Reading
      </a>
    </div>
  );
}
