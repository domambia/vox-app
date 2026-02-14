import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api_client.dart';
import 'kyc_service.dart';

class KycUploadDocumentScreen extends StatefulWidget {
  const KycUploadDocumentScreen({super.key});

  static const routeName = '/profile/kyc/upload-document';

  @override
  State<KycUploadDocumentScreen> createState() => _KycUploadDocumentScreenState();
}

class _KycUploadDocumentScreenState extends State<KycUploadDocumentScreen> {
  String? _filePath;
  bool _uploading = false;

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['png', 'jpg', 'jpeg', 'pdf'],
      withData: false,
    );
    if (result == null || result.files.isEmpty) return;
    setState(() {
      _filePath = result.files.single.path;
    });
  }

  Future<void> _upload() async {
    final path = _filePath;
    if (path == null || path.isEmpty || _uploading) return;

    setState(() => _uploading = true);
    try {
      final service = KycService(Provider.of<ApiClient>(context, listen: false));
      await service.uploadDocument(filePath: path);

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Upload document')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Text(
              'Upload a clear photo or PDF of your document.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _pickFile,
              icon: const Icon(Icons.attach_file),
              label: const Text('Choose file'),
            ),
            const SizedBox(height: 12),
            if (_filePath != null)
              Text(
                _filePath!,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: (_filePath == null || _uploading) ? null : _upload,
                child: Text(_uploading ? 'Uploading...' : 'Upload'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
