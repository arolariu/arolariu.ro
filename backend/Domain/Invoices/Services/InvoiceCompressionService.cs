using ImageMagick;
using System.IO;

namespace ContainerBackend.Domain.Invoices.Services
{
    /// <summary>
    /// The invoice compression service.
    /// </summary>
    public static class InvoiceCompressionService
    {
        /// <summary>
        /// The compress stream method.
        /// </summary>
        /// <param name="blob"></param>
        /// <returns></returns>
        public static byte[] CompressStream(byte[] blob)
        {
            using var stream = new MemoryStream(blob);
            using var image = new MagickImage(stream);

            // Set the compression level
            image.Quality = 50;

            // Save the compressed image to a byte array
            using var compressedStream = new MemoryStream();

            image.Write(compressedStream, MagickFormat.Jpeg);
            var compressedData = compressedStream.ToArray();
            return compressedData;
        }
    }
}
