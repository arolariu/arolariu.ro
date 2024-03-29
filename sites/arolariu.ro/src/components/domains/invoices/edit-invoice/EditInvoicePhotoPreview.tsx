import { useZustandStore } from "@/hooks/stateStore";
import Image from "next/image";
import {useEffect, useState} from "react";

export default function EditInvoicePhotoPreview() {
	const invoice = useZustandStore((state) => state.selectedInvoice);
	const [photoAsBlob, setPhotoAsBlob] = useState<Blob>(null!);

	useEffect(() => {
		if (invoice.photoLocation) {
			fetch(invoice.photoLocation)
				.then((response) => response.blob())
				.then((blob) => {
					setPhotoAsBlob(blob);
				});
		}
	}, [invoice.photoLocation]);

	if (photoAsBlob != null) {
		if (photoAsBlob.type === "application/pdf") {
			return (
				<div className="w-2/3 mx-auto mb-10 md:w-1/2 lg:w-1/3 xl:w-1/4">
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
					className="block object-fill object-center border-2 border-gray-700 border-dashed rounded-lg"
					alt="Submitted receipt image"
					src={URL.createObjectURL(photoAsBlob)}
					width={900}
					height={1800}
				/>
			);
		}
	} else {
		return (
			<Image
				className="block object-cover object-center w-full mb-10 rounded"
				alt="Default dummy image"
				src="https://dummyimage.com/600x900&text=placeholder"
				width={900}
				height={900}
			/>
		);
	}
}
