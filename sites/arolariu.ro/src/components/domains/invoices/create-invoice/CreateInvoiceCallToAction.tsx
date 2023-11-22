
interface Props {
    // eslint-disable-next-line no-unused-vars
    handlePhotoUpload: (event: any) => void;
}

export default function CreateInvoiceCallToAction({ handlePhotoUpload }: Props) {
    return (
			<div className="flex flex-col w-full text-center">
				<h1 className="mb-4 text-xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
					<strong>UPLOAD A PICTURE OF THE PAPER RECEIPT</strong>
				</h1>
				<p className="mx-auto text-base leading-relaxed lg:w-2/3">
					Carefully photograph or scan your paper receipt. <br />
					Attach the digital image from your device, here.
				</p>

				<form className="container my-5">
					<input
						type="file"
						name="file"
						className="w-full max-w-xs file-input file-input-bordered"
						title="Test"
						onChange={handlePhotoUpload}
					/>
					<button type="submit" title="Submit" className="hidden" />
				</form>
			</div>
		);
}
