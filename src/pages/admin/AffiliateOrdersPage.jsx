import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    Link,
    ListSubheader,
    MenuItem,
    Menu,
    Paper,
    Select,
    Snackbar,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../../lib/api';
import TemplateManagementModal from '../../components/TemplateManagementModal';
import { CHAT_TEMPLATES, personalizeTemplate } from '../../constants/chatTemplates';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCING_STATUSES = ['Not Yet', 'Done', 'Added to cart', 'Cancelled order'];
const PURCHASERS = ['Ayushman', 'Debabrata', 'CEO Sir', 'Sakchi Ma\'am', 'Dev sir'];
const MESSAGE_STATUSES = [
    'Being Processed',
    'Late Message',
    'Cancellation Message',
    'Alternative Message',
    'Confirmation Message',
];

const SOURCING_STATUS_COLORS = {
    'Done': 'success',
    'Not Yet': 'default',
    'Added to cart': 'warning',
    'Cancelled order': 'error',
};

const MSG_STATUS_COLORS = {
    'Being Processed': '#ff9800',
    'Late Message': '#f4d03f',
    'Cancellation Message': '#42a5f5',
    'Alternative Message': '#ab47bc',
    'Confirmation Message': '#bdbdbd',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

function fmt(val, digits = 2) {
    if (val == null || val === '') return '—';
    return Number(val).toFixed(digits);
}

// ─── Inline Select Cell ───────────────────────────────────────────────────────

function InlineSelect({ value, options, onChange, size = 'small', sx = {} }) {
    return (
        <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            size={size}
            displayEmpty
            sx={{ minWidth: 140, fontSize: '0.8rem', ...sx }}
        >
            <MenuItem value=""><em>—</em></MenuItem>
            {options.map((o) => (
                <MenuItem key={o} value={o} sx={{ fontSize: '0.8rem' }}>{o}</MenuItem>
            ))}
        </Select>
    );
}

// ─── Inline Text Cell (click-to-edit with save) ───────────────────────────────

function InlineText({ value, onSave, placeholder = '—', multiline = false }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (!editing) setDraft(value || '');
    }, [value, editing]);

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        if (draft !== (value || '')) onSave(draft);
    };

    if (editing) {
        return (
            <TextField
                inputRef={inputRef}
                value={draft}
                size="small"
                multiline={multiline}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setEditing(false); setDraft(value || ''); } }}
                sx={{ minWidth: 180, fontSize: '0.8rem' }}
            />
        );
    }

    return (
        <Box
            onClick={() => setEditing(true)}
            sx={{
                cursor: 'text',
                minWidth: 120,
                minHeight: 24,
                px: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                fontSize: '0.8rem',
                color: value ? 'text.primary' : 'text.disabled',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        >
            {value || placeholder}
        </Box>
    );
}

function ImageDialog({ open, onClose, images }) {
    const theme = useTheme();
    const isMobileDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (open) {
            setCurrentIndex(0);
        }
    }, [open]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobileDialog}>
            <DialogTitle sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        Images ({currentIndex + 1}/{images.length})
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
                {images.length > 0 ? (
                    <Box>
                        <Box
                            sx={{
                                width: '100%',
                                height: { xs: 'calc(100vh - 200px)', sm: 500 },
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                mb: 2,
                                position: 'relative'
                            }}
                        >
                            <img
                                src={images[currentIndex]}
                                alt={`Item ${currentIndex + 1}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain'
                                }}
                            />

                            {images.length > 1 && isMobileDialog && (
                                <>
                                    <IconButton
                                        onClick={handlePrev}
                                        sx={{
                                            position: 'absolute',
                                            left: 4,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                        }}
                                    >
                                        <NavigateBeforeIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={handleNext}
                                        sx={{
                                            position: 'absolute',
                                            right: 4,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            bgcolor: 'rgba(255,255,255,0.8)',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                        }}
                                    >
                                        <NavigateNextIcon />
                                    </IconButton>
                                </>
                            )}
                        </Box>

                        {images.length > 1 && !isMobileDialog && (
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Button onClick={handlePrev} startIcon={<NavigateBeforeIcon />} variant="outlined">
                                    Previous
                                </Button>
                                <Button onClick={handleNext} endIcon={<NavigateNextIcon />} variant="outlined">
                                    Next
                                </Button>
                            </Stack>
                        )}

                        {images.length > 1 && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{
                                    overflowX: 'auto',
                                    pb: 1,
                                    justifyContent: { xs: 'flex-start', sm: 'center' },
                                    flexWrap: { xs: 'nowrap', sm: 'wrap' }
                                }}
                            >
                                {images.map((img, idx) => (
                                    <Box
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        sx={{
                                            width: { xs: 60, sm: 80 },
                                            height: { xs: 60, sm: 80 },
                                            cursor: 'pointer',
                                            border: idx === currentIndex ? '3px solid' : '1px solid',
                                            borderColor: idx === currentIndex ? 'primary.main' : 'grey.300',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            '&:hover': {
                                                borderColor: 'primary.main',
                                                opacity: 0.8
                                            }
                                        }}
                                    >
                                        <img
                                            src={img}
                                            alt={`Thumbnail ${idx + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Box>
                ) : (
                    <Alert severity="info">No images available for this item</Alert>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ChatDialog({ open, onClose, order }) {
    const theme = useTheme();
    const isMobileChat = useMediaQuery(theme.breakpoints.down('sm'));

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const pollingInterval = useRef(null);
    const [templateAnchorEl, setTemplateAnchorEl] = useState(null);
    const [chatTemplates, setChatTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);

    useEffect(() => {
        if (open && order) {
            loadMessages();
            startPolling();
        } else {
            stopPolling();
            setMessages([]);
            setNewMessage('');
        }
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, order]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        loadChatTemplates();
    }, []);

    const stopPolling = () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
    };

    const startPolling = () => {
        stopPolling();
        pollingInterval.current = setInterval(() => {
            if (order) {
                const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
                api.post('/ebay/sync-thread', {
                    sellerId: order.seller?._id || order.seller,
                    buyerUsername: order.buyer?.username,
                    itemId
                }).then((res) => {
                    if (res.data.newMessagesFound) {
                        loadMessages(false);
                    }
                }).catch((err) => console.error('Polling error', err));
            }
        }, 10000);
    };

    async function loadMessages(showLoading = true) {
        if (showLoading) setLoading(true);
        try {
            const { data } = await api.get('/ebay/chat/messages', {
                params: { orderId: order.orderId }
            });
            setMessages(data || []);
        } catch (e) {
            console.error('Failed to load messages', e);
        } finally {
            if (showLoading) setLoading(false);
        }
    }

    async function handleSendMessage() {
        if (!newMessage.trim()) return;
        setSending(true);
        try {
            const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
            const { data } = await api.post('/ebay/send-message', {
                orderId: order.orderId,
                buyerUsername: order.buyer?.username,
                itemId,
                body: newMessage,
                subject: `Regarding Order #${order.orderId}`
            });

            setMessages([...messages, data.message]);
            setNewMessage('');
        } catch (e) {
            alert('Failed to send: ' + (e.response?.data?.error || e.message));
        } finally {
            setSending(false);
        }
    }

    async function loadChatTemplates() {
        setTemplatesLoading(true);
        try {
            const { data } = await api.get('/chat-templates');
            if (data.templates && data.templates.length > 0) {
                setChatTemplates(data.templates);
            }
        } catch (e) {
            console.error('Failed to load chat templates:', e);
            setChatTemplates(CHAT_TEMPLATES);
        } finally {
            setTemplatesLoading(false);
        }
    }

    const handleTemplateClick = (event) => {
        setTemplateAnchorEl(event.currentTarget);
    };

    const handleTemplateClose = () => {
        setTemplateAnchorEl(null);
    };

    const handleSelectTemplate = (templateText) => {
        const nameToUse = order.shippingFullName || order.buyer?.username || 'Buyer';
        const personalizedText = personalizeTemplate(templateText, nameToUse);

        setNewMessage(personalizedText);
        handleTemplateClose();
    };

    const sellerName = order?.seller?.user?.username || 'Seller';
    const buyerName = order?.buyer?.buyerRegistrationAddress?.fullName || '-';
    const buyerUsername = order?.buyer?.username || '-';
    const itemId = order?.itemNumber || order?.lineItems?.[0]?.legacyItemId || '';
    let itemTitle = order?.productName || order?.lineItems?.[0]?.title || '';
    const itemCount = order?.lineItems?.length || 0;
    if (itemCount > 1) {
        itemTitle = `${itemTitle} (+ ${itemCount - 1} other${itemCount - 1 > 1 ? 's' : ''})`;
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={isMobileChat}>
            <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', position: 'relative' }}>
                <Stack
                    direction="column"
                    spacing={1}
                    alignItems="flex-end"
                    sx={{ position: 'absolute', top: { xs: 8, sm: 12 }, right: { xs: 8, sm: 12 }, zIndex: 10 }}
                >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        {!isMobileChat && (
                            <Chip
                                label={sellerName}
                                size="small"
                                icon={<PersonIcon style={{ fontSize: 16 }} />}
                                sx={{
                                    bgcolor: '#e3f2fd',
                                    color: '#1565c0',
                                    fontWeight: 'bold',
                                    height: 24,
                                    fontSize: '0.75rem'
                                }}
                            />
                        )}
                        <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled' }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    <Tooltip title="Choose a response template">
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleTemplateClick}
                            disabled={sending}
                            sx={{
                                minWidth: { xs: 'auto', sm: 100 },
                                px: { xs: 1, sm: 2 },
                                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                                bgcolor: 'white'
                            }}
                            endIcon={<ExpandMoreIcon />}
                        >
                            Templates
                        </Button>
                    </Tooltip>
                </Stack>

                <Stack spacing={1} sx={{ pr: { xs: 6, sm: 12 } }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={{ xs: 0.5, sm: 3 }}
                        sx={{ mt: 0.5 }}
                    >
                        <Box>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Buyer
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.1, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                                {buyerName}
                            </Typography>
                        </Box>

                        {!isMobileChat && (
                            <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center', opacity: 0.5 }} />
                        )}

                        <Box>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Username
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                {buyerUsername}
                            </Typography>
                        </Box>
                    </Stack>

                    <Box>
                        <Link
                            href={`https://www.ebay.com/itm/${itemId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    lineHeight: 1.3,
                                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                    display: '-webkit-box',
                                    WebkitLineClamp: isMobileChat ? 1 : 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}
                            >
                                {itemTitle || `Item ID: ${itemId}`}
                            </Typography>
                            <OpenInNewIcon sx={{ fontSize: 14, color: 'primary.main', mt: 0.3, flexShrink: 0 }} />
                        </Link>

                        <Chip
                            label={`Order: ${order?.orderId || order?.legacyOrderId || 'N/A'}`}
                            size="small"
                            variant="outlined"
                            sx={{
                                borderRadius: 1,
                                height: 20,
                                fontSize: '0.65rem',
                                color: 'text.secondary',
                                borderColor: 'divider',
                                bgcolor: '#fafafa'
                            }}
                        />
                    </Box>
                </Stack>
            </Box>

            <DialogContent sx={{ p: 0, bgcolor: '#f0f2f5', height: { xs: 'calc(100vh - 180px)', sm: '500px' }, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
                    ) : (
                        <Stack spacing={2}>
                            {messages.length === 0 && (
                                <Alert severity="info" sx={{ mx: 'auto', width: 'fit-content' }}>
                                    No messages yet. Start the conversation below!
                                </Alert>
                            )}

                            {messages.map((msg) => (
                                <Box
                                    key={msg._id}
                                    sx={{
                                        alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start',
                                        maxWidth: '70%'
                                    }}
                                >
                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 1.5,
                                            bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#ffffff',
                                            color: msg.sender === 'SELLER' ? '#fff' : 'text.primary',
                                            borderRadius: 2,
                                            position: 'relative'
                                        }}
                                    >
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.body}</Typography>

                                        {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                {msg.mediaUrls.map((url, idx) => (
                                                    <Box
                                                        key={idx}
                                                        component="img"
                                                        src={url}
                                                        alt="Attachment"
                                                        sx={{
                                                            width: 100,
                                                            height: 100,
                                                            objectFit: 'cover',
                                                            borderRadius: 1,
                                                            cursor: 'pointer',
                                                            border: '1px solid #ccc'
                                                        }}
                                                        onClick={() => window.open(url, '_blank')}
                                                    />
                                                ))}
                                            </Box>
                                        )}
                                    </Paper>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: msg.sender === 'SELLER' ? 'right' : 'left', fontSize: '0.7rem' }}>
                                        {new Date(msg.messageDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} PT
                                        {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                                    </Typography>
                                </Box>
                            ))}
                            <div ref={messagesEndRef} />
                        </Stack>
                    )}
                </Box>

                <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: '#fff', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        multiline
                        maxRows={3}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        disabled={sending}
                        size="small"
                        sx={{
                            '& .MuiInputBase-input': {
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                            }
                        }}
                    />
                    <Menu
                        anchorEl={templateAnchorEl}
                        open={Boolean(templateAnchorEl)}
                        onClose={handleTemplateClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        PaperProps={{
                            style: {
                                maxHeight: 400,
                                width: 320,
                            },
                        }}
                    >
                        <MenuItem
                            onClick={() => { handleTemplateClose(); setManageTemplatesOpen(true); }}
                            sx={{
                                borderBottom: '2px solid #e0e0e0',
                                bgcolor: '#f9f9ff',
                                py: 1.5
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <SettingsIcon fontSize="small" color="primary" />
                                <Typography variant="subtitle2" color="primary">Manage Templates</Typography>
                            </Stack>
                        </MenuItem>

                        {templatesLoading ? (
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <CircularProgress size={20} />
                            </Box>
                        ) : chatTemplates.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                No templates available. Click "Manage Templates" to add some.
                            </Typography>
                        ) : (
                            chatTemplates.map((group, index) => (
                                <Box key={index}>
                                    <ListSubheader
                                        sx={{
                                            bgcolor: '#f5f5f5',
                                            fontWeight: 'bold',
                                            lineHeight: '32px',
                                            color: 'primary.main',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {group.category}
                                    </ListSubheader>
                                    {group.items.map((item, idx) => (
                                        <MenuItem
                                            key={item._id || idx}
                                            onClick={() => handleSelectTemplate(item.text)}
                                            sx={{
                                                fontSize: '0.85rem',
                                                whiteSpace: 'normal',
                                                py: 1,
                                                borderBottom: '1px solid #f0f0f0',
                                                display: 'block'
                                            }}
                                        >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                {item.label}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                {item.text}
                                            </Typography>
                                        </MenuItem>
                                    ))}
                                </Box>
                            ))
                        )}
                    </Menu>
                    <Button
                        variant="contained"
                        sx={{ px: { xs: 2, sm: 3 }, minWidth: { xs: 'auto', sm: 80 } }}
                        endIcon={!isMobileChat && (sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />)}
                        onClick={handleSendMessage}
                        disabled={sending || !newMessage.trim()}
                    >
                        {isMobileChat ? <SendIcon /> : 'Send'}
                    </Button>
                </Box>
            </DialogContent>

            <TemplateManagementModal
                open={manageTemplatesOpen}
                onClose={() => {
                    setManageTemplatesOpen(false);
                    loadChatTemplates();
                }}
            />
        </Dialog>
    );
}

// ─── Tab Panel Helper ─────────────────────────────────────────────────────────

function TabPanel({ children, value, index }) {
    return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AffiliateOrdersPage() {
    const [date, setDate] = useState(getTodayStr());
    const [tab, setTab] = useState(0);
    const [excludeLowValue, setExcludeLowValue] = useState(false);

    // Tab 1 state
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState('');
    const [amazonAccounts, setAmazonAccounts] = useState([]);

    // Tab 2 state
    const [balances, setBalances] = useState([]);
    const [balancesLoading, setBalancesLoading] = useState(false);
    const [balancesError, setBalancesError] = useState('');

    // Tab 3 state
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    // Snackbar
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const notify = (severity, msg) => setSnack({ open: true, msg, severity });

    // Product images
    const [itemImages, setItemImages] = useState({});
    const [thumbnailImages, setThumbnailImages] = useState({});
    const [loadingImages, setLoadingImages] = useState({});
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);

    // Messaging modal
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [selectedOrderForMessage, setSelectedOrderForMessage] = useState(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchOrders = useCallback(async () => {
        setOrdersLoading(true);
        setOrdersError('');
        try {
            const { data } = await api.get('/affiliate-orders/daily', { params: { date, excludeLowValue: excludeLowValue ? 'true' : 'false' } });
            setOrders(data);
        } catch (err) {
            setOrdersError(err?.response?.data?.error || 'Failed to load orders');
        } finally {
            setOrdersLoading(false);
        }
    }, [date, excludeLowValue]);

    const fetchAmazonAccounts = useCallback(async () => {
        try {
            const { data } = await api.get('/amazon-accounts');
            setAmazonAccounts(data.map((a) => a.name));
        } catch { /* silent */ }
    }, []);

    const fetchBalances = useCallback(async () => {
        setBalancesLoading(true);
        setBalancesError('');
        try {
            const { data } = await api.get('/affiliate-orders/balances', { params: { date, excludeLowValue: excludeLowValue ? 'true' : 'false' } });
            setBalances(data);
        } catch (err) {
            setBalancesError(err?.response?.data?.error || 'Failed to load balances');
        } finally {
            setBalancesLoading(false);
        }
    }, [date, excludeLowValue]);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        setSummaryError('');
        try {
            const { data } = await api.get('/affiliate-orders/summary', { params: { date, excludeLowValue: excludeLowValue ? 'true' : 'false' } });
            setSummary(data);
        } catch (err) {
            setSummaryError(err?.response?.data?.error || 'Failed to load summary');
        } finally {
            setSummaryLoading(false);
        }
    }, [date, excludeLowValue]);

    useEffect(() => {
        fetchOrders();
        fetchAmazonAccounts();
        fetchBalances();
        fetchSummary();
    }, [date, excludeLowValue, fetchOrders, fetchAmazonAccounts, fetchBalances, fetchSummary]);

    // ── Order field patch ──────────────────────────────────────────────────────

    const patchOrder = useCallback(async (orderId, field, value) => {
        try {
            const { data } = await api.patch(`/affiliate-orders/${orderId}/sourcing`, { [field]: value });
            setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, ...data } : o)));
            // refresh balances & summary since expense may have changed
            fetchBalances();
            fetchSummary();
        } catch (err) {
            notify('error', err?.response?.data?.error || `Failed to update ${field}`);
        }
    }, [fetchBalances, fetchSummary]);

    // ── Balance field patch ────────────────────────────────────────────────────

    const patchBalance = useCallback(async (accountName, field, value) => {
        try {
            // Get current row to send full payload
            const current = balances.find((b) => b.amazonAccountName === accountName) || {};
            const payload = {
                amazonAccountName: accountName,
                date,
                availableBalance: current.availableBalance ?? 0,
                addedBalance: current.addedBalance ?? 0,
                giftCardStatus: current.giftCardStatus ?? false,
                note: current.note ?? '',
                [field]: value,
            };
            const { data: updated } = await api.put('/affiliate-orders/balances', payload);
            setBalances((prev) =>
                prev.map((b) => {
                    if (b.amazonAccountName !== accountName) return b;
                    const avail = field === 'availableBalance' ? value : b.availableBalance;
                    const added = field === 'addedBalance' ? value : b.addedBalance;
                    return {
                        ...b,
                        ...updated,
                        availableBalance: avail,
                        addedBalance: added,
                        difference: avail + added - b.totalExpense,
                    };
                })
            );
            fetchSummary();
        } catch (err) {
            notify('error', err?.response?.data?.error || `Failed to update ${field}`);
        }
    }, [balances, date, fetchSummary]);

    const fetchThumbnail = async (order) => {
        const orderId = order._id;
        const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
        const sellerId = order.seller?._id || order.seller;

        if (!itemId || !sellerId || thumbnailImages[orderId]) {
            return;
        }

        try {
            const { data } = await api.get(`/ebay/item-images/${itemId}?sellerId=${sellerId}&thumbnail=true`);
            if (data.images && data.images.length > 0) {
                setThumbnailImages((prev) => ({ ...prev, [orderId]: data.images[0] }));
                if (data.total > 1) {
                    setItemImages((prev) => ({ ...prev, [orderId]: { count: data.total } }));
                }
            }
        } catch (error) {
            console.error('Error fetching thumbnail:', error);
        }
    };

    const fetchAllImages = async (order) => {
        const orderId = order._id;
        const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
        const sellerId = order.seller?._id || order.seller;

        if (itemImages[orderId]?.images) {
            return itemImages[orderId].images;
        }

        setLoadingImages((prev) => ({ ...prev, [orderId]: true }));

        try {
            const { data } = await api.get(`/ebay/item-images/${itemId}?sellerId=${sellerId}`);
            const allImages = data.images || [];
            setItemImages((prev) => ({ ...prev, [orderId]: { images: allImages, count: allImages.length } }));
            return allImages;
        } catch (error) {
            console.error('Error fetching all images:', error);
            return [];
        } finally {
            setLoadingImages((prev) => ({ ...prev, [orderId]: false }));
        }
    };

    useEffect(() => {
        if (orders.length > 0) {
            orders.forEach((order) => {
                fetchThumbnail(order);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);

    const handleViewImages = async (order) => {
        const allImages = await fetchAllImages(order);
        if (allImages.length > 0) {
            setSelectedImages(allImages);
            setImageDialogOpen(true);
        }
    };

    const handleOpenMessageDialog = (order) => {
        setSelectedOrderForMessage(order);
        setMessageModalOpen(true);
    };

    const handleCloseMessageDialog = () => {
        setMessageModalOpen(false);
        setSelectedOrderForMessage(null);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER — Tab 1: Daily Orders
    // ─────────────────────────────────────────────────────────────────────────

    const renderTab1 = () => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {ordersLoading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} for ${date}`}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchOrders}>Refresh</Button>
            </Stack>

            {ordersError && <Alert severity="error" sx={{ mb: 1 }}>{ordersError}</Alert>}

            {ordersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 1100 }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#fce4ec' }}>
                                {[
                                    '#', 'Order ID', 'Product Name', 'Seller',
                                    'Supplier Link', 'Affiliate Links', 'Price (USD)',
                                    'Amazon Account', 'Status', 'Purchaser',
                                    'Message Status', 'Messaging', 'Notes',
                                ].map((h) => (
                                    <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={13} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                        No orders found for this date.
                                    </TableCell>
                                </TableRow>
                            )}
                            {orders.map((order, idx) => {
                                const sellerName = order.seller?.user?.username || '—';
                                const itemId = order.lineItems?.[0]?.legacyItemId || order.itemNumber;
                                const productTitle = order.lineItems?.[0]?.title || order.productName || '—';
                                return (
                                    <TableRow key={order._id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                                        {/* # */}
                                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{idx + 1}</TableCell>

                                        {/* Order ID */}
                                        <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <span>{order.orderId}</span>
                                                <Tooltip title="Copy">
                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(order.orderId); notify('info', 'Copied'); }}>
                                                        <ContentCopyIcon sx={{ fontSize: 12 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>

                                        {/* Product Name */}
                                        <TableCell sx={{ minWidth: 300, maxWidth: 360 }}>
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                                {thumbnailImages[order._id] && (
                                                    <Box
                                                        onClick={() => handleViewImages(order)}
                                                        sx={{
                                                            width: 50,
                                                            height: 50,
                                                            cursor: 'pointer',
                                                            border: '1px solid',
                                                            borderColor: 'grey.300',
                                                            borderRadius: 1,
                                                            overflow: 'hidden',
                                                            flexShrink: 0,
                                                            position: 'relative',
                                                            '&:hover': {
                                                                borderColor: 'primary.main',
                                                                boxShadow: 2
                                                            }
                                                        }}
                                                    >
                                                        <img
                                                            src={thumbnailImages[order._id]}
                                                            alt="Product"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        {itemImages[order._id]?.count > 1 && (
                                                            <Chip
                                                                label={`+${itemImages[order._id].count - 1}`}
                                                                size="small"
                                                                sx={{
                                                                    position: 'absolute',
                                                                    bottom: 2,
                                                                    right: 2,
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: 'rgba(0,0,0,0.7)',
                                                                    color: 'white',
                                                                    '& .MuiChip-label': { px: 0.5 }
                                                                }}
                                                            />
                                                        )}
                                                        {loadingImages[order._id] && (
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    inset: 0,
                                                                    bgcolor: 'rgba(255,255,255,0.8)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <CircularProgress size={18} />
                                                            </Box>
                                                        )}
                                                    </Box>
                                                )}

                                                <Box sx={{ minWidth: 0 }}>
                                                    {itemId ? (
                                                        <Link
                                                            href={`https://www.ebay.com/itm/${itemId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            underline="hover"
                                                            sx={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0.5 }}
                                                        >
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: 600,
                                                                    color: 'primary.main',
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                {productTitle}
                                                            </Typography>
                                                            <OpenInNewIcon sx={{ fontSize: 13, mt: 0.2, flexShrink: 0 }} />
                                                        </Link>
                                                    ) : (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {productTitle}
                                                        </Typography>
                                                    )}
                                                    {itemId && (
                                                        <Link
                                                            href={`https://www.ebay.com/itm/${itemId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{ display: 'inline-block', mt: 0.25, fontSize: '0.72rem' }}
                                                        >
                                                            ID: {itemId}
                                                        </Link>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </TableCell>

                                        {/* Seller */}
                                        <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{sellerName}</TableCell>

                                        {/* Supplier Link */}
                                        <TableCell sx={{ minWidth: 220 }}>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <InlineText
                                                    value={order.affiliateLink}
                                                    placeholder="Paste supplier link…"
                                                    onSave={(v) => patchOrder(order._id, 'affiliateLink', v)}
                                                />
                                                {order.affiliateLink && (
                                                    <Tooltip title="Open link">
                                                        <IconButton size="small" component="a" href={order.affiliateLink} target="_blank" rel="noopener noreferrer">
                                                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>

                                        {/* Affiliate Links */}
                                        <TableCell sx={{ minWidth: 220 }}>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <InlineText
                                                    value={order.affiliateLinks}
                                                    placeholder="Paste affiliate link…"
                                                    onSave={(v) => patchOrder(order._id, 'affiliateLinks', v)}
                                                />
                                                {order.affiliateLinks && (
                                                    <Tooltip title="Open link">
                                                        <IconButton size="small" component="a" href={order.affiliateLinks} target="_blank" rel="noopener noreferrer">
                                                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>

                                        {/* Price — editable */}
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <BalanceNumberCell
                                                value={order.beforeTaxUSD ?? null}
                                                onSave={(v) => patchOrder(order._id, 'beforeTaxUSD', v)}
                                            />
                                        </TableCell>

                                        {/* Amazon Account */}
                                        <TableCell>
                                            <InlineSelect
                                                value={order.amazonAccount}
                                                options={amazonAccounts}
                                                onChange={(v) => patchOrder(order._id, 'amazonAccount', v)}
                                            />
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <FormControl size="small">
                                                <Select
                                                    value={order.sourcingStatus || 'Not Yet'}
                                                    onChange={(e) => patchOrder(order._id, 'sourcingStatus', e.target.value)}
                                                    size="small"
                                                    sx={{ minWidth: 130, fontSize: '0.8rem' }}
                                                    renderValue={(v) => (
                                                        <Chip
                                                            label={v}
                                                            size="small"
                                                            color={SOURCING_STATUS_COLORS[v] || 'default'}
                                                            sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        />
                                                    )}
                                                >
                                                    {SOURCING_STATUSES.map((s) => (
                                                        <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem' }}>
                                                            <Chip label={s} size="small" color={SOURCING_STATUS_COLORS[s] || 'default'} sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} />
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        {/* Purchaser */}
                                        <TableCell>
                                            <InlineSelect
                                                value={order.purchaser}
                                                options={PURCHASERS}
                                                onChange={(v) => patchOrder(order._id, 'purchaser', v)}
                                            />
                                        </TableCell>

                                        {/* Message Status */}
                                        <TableCell>
                                            <FormControl size="small">
                                                <Select
                                                    value={order.sourcingMessageStatus || 'Being Processed'}
                                                    onChange={(e) => patchOrder(order._id, 'sourcingMessageStatus', e.target.value)}
                                                    size="small"
                                                    sx={{ minWidth: 160, fontSize: '0.8rem' }}
                                                    renderValue={(v) => (
                                                        <Chip
                                                            label={v}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 'bold',
                                                                fontSize: '0.72rem',
                                                                bgcolor: MSG_STATUS_COLORS[v] || '#e0e0e0',
                                                                color: '#fff',
                                                            }}
                                                        />
                                                    )}
                                                >
                                                    {MESSAGE_STATUSES.map((s) => (
                                                        <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem' }}>
                                                            <Chip
                                                                label={s}
                                                                size="small"
                                                                sx={{ bgcolor: MSG_STATUS_COLORS[s] || '#e0e0e0', color: '#fff', fontSize: '0.72rem' }}
                                                            />
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        {/* Messaging */}
                                        <TableCell align="center">
                                            <Tooltip title="Send message to buyer">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenMessageDialog(order)}
                                                >
                                                    <ChatIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>

                                        {/* Notes */}
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <InlineText
                                                value={order.fulfillmentNotes}
                                                placeholder="Add note…"
                                                multiline
                                                onSave={(v) => patchOrder(order._id, 'fulfillmentNotes', v)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER — Tab 2: Gift Card Balances
    // ─────────────────────────────────────────────────────────────────────────

    const renderTab2 = () => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {balancesLoading ? 'Loading…' : `${balances.length} Amazon account${balances.length !== 1 ? 's' : ''}`}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchBalances}>Refresh</Button>
            </Stack>

            {balancesError && <Alert severity="error" sx={{ mb: 1 }}>{balancesError}</Alert>}

            {balancesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                {[
                                    'Account Name', 'Total Expense ($)', 'Gift Cards ✓',
                                    'Available Balance ($)', 'Difference ($)', 'Added Balance ($)', 'Note',
                                ].map((h) => (
                                    <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {balances.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                        No Amazon accounts found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {balances.map((row) => {
                                const diff = (row.availableBalance || 0) + (row.addedBalance || 0) - (row.totalExpense || 0);
                                return (
                                    <TableRow key={row.amazonAccountName} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#f9fbe7' } }}>
                                        {/* Account Name */}
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#1565c0' }}>
                                            {row.amazonAccountName}
                                        </TableCell>

                                        {/* Total Expense — read-only, calculated from orders */}
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                                            {fmt(row.totalExpense)}
                                            {row.orderCount > 0 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                    ({row.orderCount} order{row.orderCount !== 1 ? 's' : ''})
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Gift Card Status — checkbox */}
                                        <TableCell align="center">
                                            <Checkbox
                                                checked={!!row.giftCardStatus}
                                                onChange={(e) => patchBalance(row.amazonAccountName, 'giftCardStatus', e.target.checked)}
                                                size="small"
                                                color="success"
                                            />
                                        </TableCell>

                                        {/* Available Balance — editable number */}
                                        <TableCell>
                                            <BalanceNumberCell
                                                value={row.availableBalance}
                                                onSave={(v) => patchBalance(row.amazonAccountName, 'availableBalance', v)}
                                            />
                                        </TableCell>

                                        {/* Difference — auto-calculated */}
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: diff < 0 ? 'error.main' : 'success.dark' }}>
                                            {diff >= 0 ? '+' : ''}{fmt(diff)}
                                        </TableCell>

                                        {/* Added Balance — editable number */}
                                        <TableCell>
                                            <BalanceNumberCell
                                                value={row.addedBalance}
                                                onSave={(v) => patchBalance(row.amazonAccountName, 'addedBalance', v)}
                                            />
                                        </TableCell>

                                        {/* Note */}
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <InlineText
                                                value={row.note}
                                                placeholder="Add note…"
                                                onSave={(v) => patchBalance(row.amazonAccountName, 'note', v)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER — Tab 3: Summary
    // ─────────────────────────────────────────────────────────────────────────

    const renderTab3 = () => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Summary for {date}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchSummary}>Refresh</Button>
            </Stack>

            {summaryError && <Alert severity="error" sx={{ mb: 1 }}>{summaryError}</Alert>}

            {summaryLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : summary ? (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">

                    {/* Left: Per-Purchaser */}
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 260 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            Assigned Orders by Purchaser
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#fff9c4' }}>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.78rem' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.78rem' }}>Assigned</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summary.byPurchaser.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center" sx={{ color: 'text.secondary' }}>No assignments yet</TableCell>
                                    </TableRow>
                                )}
                                {summary.byPurchaser.map((row) => (
                                    <TableRow key={row.name} hover>
                                        <TableCell sx={{ fontSize: '0.82rem', color: '#1565c0', fontWeight: 500 }}>{row.name}</TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>

                    {/* Right: Overall Totals */}
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 320 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            Day Totals
                        </Typography>
                        <Table size="small">
                            <TableBody>
                                {[
                                    { label: 'Orders →', value: summary.totalOrders, color: '#e65100' },
                                    { label: 'Total Order Amount (USD) →', value: `$${fmt(summary.totalUSD)}`, color: '#1b5e20' },
                                    { label: 'INR Amount →', value: `₹${fmt(summary.totalINR, 3)}`, color: '#b71c1c' },
                                    { label: 'Total Amount Added →', value: fmt(summary.totalAmountAdded), color: 'text.primary' },
                                    { label: 'Orders Done →', value: summary.ordersDone, color: '#2e7d32' },
                                    { label: 'Orders Not Done →', value: summary.ordersNotDone, color: '#c62828' },
                                ].map(({ label, value, color }) => (
                                    <TableRow key={label}>
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 500, border: 'none', py: 0.5 }}>{label}</TableCell>
                                        <TableCell sx={{ fontSize: '0.88rem', fontWeight: 700, color, border: 'none', py: 0.5 }}>{value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Stack>
            ) : (
                <Typography color="text.secondary">No data available.</Typography>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2 }}>
                <Typography variant="h5" fontWeight="bold">Affiliate Orders</Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <FormControlLabel
                        control={<Switch checked={excludeLowValue} onChange={(e) => setExcludeLowValue(e.target.checked)} />}
                        label="Exclude < $3"
                        sx={{ m: 0 }}
                    />
                    <TextField
                        type="date"
                        size="small"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        label="Date"
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 170 }}
                    />
                </Stack>
            </Stack>

            {/* Tabs */}
            <Paper variant="outlined" sx={{ mb: 0 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Tab label="Daily Orders" />
                    <Tab label="Gift Card Balances" />
                    <Tab label="Summary" />
                </Tabs>
            </Paper>

            <Box sx={{ mt: 0 }}>
                <TabPanel value={tab} index={0}>{renderTab1()}</TabPanel>
                <TabPanel value={tab} index={1}>{renderTab2()}</TabPanel>
                <TabPanel value={tab} index={2}>{renderTab3()}</TabPanel>
            </Box>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={2500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>

            <ChatDialog
                open={messageModalOpen}
                onClose={handleCloseMessageDialog}
                order={selectedOrderForMessage}
            />

            <ImageDialog
                open={imageDialogOpen}
                onClose={() => setImageDialogOpen(false)}
                images={selectedImages}
            />
        </Box>
    );
}

// ─── Editable Number Cell ─────────────────────────────────────────────────────

function BalanceNumberCell({ value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value ?? 0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!editing) setDraft(value ?? 0);
    }, [value, editing]);

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        const num = parseFloat(draft);
        if (!isNaN(num) && num !== (value ?? 0)) onSave(num);
    };

    if (editing) {
        return (
            <TextField
                inputRef={inputRef}
                value={draft}
                type="number"
                size="small"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(value ?? 0); } }}
                sx={{ width: 100, fontSize: '0.8rem' }}
                inputProps={{ step: 'any' }}
            />
        );
    }

    return (
        <Box
            onClick={() => setEditing(true)}
            sx={{
                cursor: 'text',
                minWidth: 80,
                px: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                fontSize: '0.82rem',
                fontWeight: 500,
            }}
        >
            {value != null ? value : 0}
        </Box>
    );
}
