import { isCloudinaryEnabled, uploadToCloudinary } from '../services/cloudinaryService.js';

export async function getUploadStatus(req, res) {
  return res.json({
    success: true,
    enabled: isCloudinaryEnabled(),
  });
}

export async function handleFileUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    if (!isCloudinaryEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary upload is not configured on the server. Upload is disabled.',
      });
    }

    const folder = req.body.folder || 'ntorq';
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, folder);

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      file: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
}
