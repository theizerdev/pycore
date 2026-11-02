with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'rb') as f:
    data = f.read()

# Replace </div></div>\r\n with </div>\r\n
# Let's inspect bytes around </div></div>
pos = data.find(b'</div></div>')
print('pos:', pos)
if pos != -1:
    # replace first occurrence of </div></div> with </div>
    data = data[:pos] + b'</div>' + data[pos+6:]

# Now let's check the end of the file
# We want:
#         </DialogContent>
#       </Dialog>
#     </Dialog>
#   );
# };
#
# export default DocumentosImpresionModal;

pos_end = data.rfind(b'</Dialog>')
print('pos_end:', pos_end)

with open('frontend/src/components/clinica/DocumentosImpresionModal.tsx', 'wb') as f:
    f.write(data)

print('Done fixing!')

