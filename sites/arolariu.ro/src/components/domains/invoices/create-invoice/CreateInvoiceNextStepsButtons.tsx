interface Props {
	imageBlob: Blob;
	// eslint-disable-next-line no-unused-vars
	sendInvoiceToBackend: (image: Blob) => void;
	// eslint-disable-next-line no-unused-vars
	setImageBlob: (image: Blob) => void;
}

export default function CreateInvoiceNextStepsButtons({
	imageBlob,
	sendInvoiceToBackend,
	setImageBlob,
}: Props) {
	if (imageBlob) {
		return (
			<div className="container flex flex-col">
				<button
					className="mx-auto mt-4 btn btn-primary"
					type="button"
					onClick={() => sendInvoiceToBackend(imageBlob)}>
					Continue to the next step
				</button>
				<button
					className="mx-auto mt-4 btn btn-secondary"
					type="button"
					onClick={() => setImageBlob(null!)}>
					Clear image
				</button>
			</div>
		);
	}
}
