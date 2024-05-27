/** @format */

export default function SubscribeForm() {
  return (
    <div className='flex flex-col items-center justify-center justify-items-center text-center'>
      <form
        action='/'
        className='mx-auto mt-5 flex flex-col gap-5 sm:flex-row'>
        <input
          type='text'
          placeholder='your email address'
          className='rounded-full border-2 p-2 px-4'
        />
        <input
          type='submit'
          value='Subscribe'
          className='cursor-pointer rounded-full bg-blue-400 p-2 px-4 text-white'
        />
      </form>
      <small className='mb-5'>You can cancel your newsletter subscription anytime.</small>
    </div>
  );
}
