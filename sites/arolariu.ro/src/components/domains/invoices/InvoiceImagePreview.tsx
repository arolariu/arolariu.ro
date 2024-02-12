import Image from "next/image";

export default function InvoiceImagePreview({ image }: { image: Blob }) {
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
	if (image != null && allowedFormats.includes(image.type)) {
		if (image.type === "application/pdf") {
			return (
				<div className="w-2/3 mx-auto mb-10 md:w-1/2 lg:w-1/3 xl:w-1/4">
					<iframe title="Submitted receipt PDF" src={URL.createObjectURL(image)} width="100%" height="600px"></iframe>
				</div>
			);
		} else {
			return (
				<Image
					className="block object-cover object-center w-2/3 mx-auto mb-10 rounded md:w-1/2 lg:w-1/3 xl:w-1/4"
					alt="Submitted receipt image"
					src={URL.createObjectURL(image)}
					width={600}
					height={900}
				/>
			);
		}
	} else {
		return (
			<Image
				className="block object-cover object-center w-2/3 mx-auto mb-10 rounded md:w-1/2 lg:w-1/3 xl:w-1/4"
				alt="Default dummy image"
				src="https://dummyimage.com/600x900&text=placeholder"
				width={600}
				height={900}
			/>
		);
	}
}
