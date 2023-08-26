import Image from "next/image";
import {useEffect, useState} from "react";

interface Props {
	invoiceUri: string;
}

export default function EditInvoicePhotoPreview({invoiceUri}: Props) {
	const [photoAsBlob, setPhotoAsBlob] = useState<Blob>(null!);

	useEffect(() => {
		fetch(invoiceUri)
			.then((res) => res.blob())
			.then((blob) => setPhotoAsBlob(blob));
	}, [invoiceUri]);

	if (photoAsBlob != null) {
		if (photoAsBlob.type === "application/pdf") {
			return (
				<div className="mx-auto mb-10 w-2/3 md:w-1/2 lg:w-1/3 xl:w-1/4">
					<iframe
						title="Submitted receipt PDF"
						src={URL.createObjectURL(photoAsBlob)}
						width="100%"
						height="600px"></iframe>
				</div>
			);
		} else {
			return (
				<Image
					className="mx-auto mb-10 block w-2/3 rounded object-cover object-center md:w-1/2 lg:w-1/3 xl:w-1/4"
					alt="Submitted receipt image"
					src={URL.createObjectURL(photoAsBlob)}
					width={600}
					height={900}
				/>
			);
		}
	} else {
		return (
			<Image
				className="mb-10 block w-full rounded object-cover object-center"
				alt="Default dummy image"
				src="https://dummyimage.com/600x900&text=placeholder"
				width={900}
				height={900}
			/>
		);
	}
}
