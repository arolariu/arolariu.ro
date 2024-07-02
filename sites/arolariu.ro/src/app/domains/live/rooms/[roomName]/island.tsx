/** @format */

"use client";

/**
 * This function renders the room screen.
 * @returns The JSX for the room screen.
 */
export default function RenderRoomScreen({roomId}: Readonly<{roomId: string}>) {
  return (
    <section className='flex flex-col items-center justify-center justify-items-center'>
      <article>
        <h1>Room {roomId}</h1>
      </article>
      <article>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Distinctio quis, quidem laboriosam molestiae autem
        consequatur esse fugiat similique nobis accusantium obcaecati. Quidem adipisci voluptate fugit eum ad ut libero
        facilis non. Corrupti voluptatibus vero, magnam officia molestias praesentium, facilis provident consectetur
        itaque fugit recusandae sequi, rerum quasi. Beatae, ipsum amet.
      </article>
    </section>
  );
}
